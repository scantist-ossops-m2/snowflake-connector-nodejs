/*
 * Copyright (c) 2015-2024 Snowflake Computing Inc. All rights reserved.
 */

const async = require('async');
const GlobalConfig = require('./../../lib/global_config');
const snowflake = require('./../../lib/snowflake');
const testUtil = require('./testUtil');
const sharedStatement = require('./sharedStatements');
const assert = require('assert');

function normalize(source) {
  let result = {};
  if (typeof source === 'object' && source !== null) {
    Object.keys(source).forEach((key) => {
      if (typeof source[key] === 'object' && source[key] !== null) {
        source[key] = testUtil.normalizeRowObject(source[key]);
        result[key] = normalize(source[key]);
      } else {
        result = source;
      }
    });
  } else {
    result = source;
  }
  return result;
}


describe('Test Structured types', function () {
  let connection;

  before(function (done) {
    connection = testUtil.createConnection({ 'proxyHost': '127.0.0.1', 'proxyPort': 8080 });
    async.series([
      function (callback) {
        snowflake.configure({ 'insecureConnect': true });
        GlobalConfig.setInsecureConnect(true);
        testUtil.connect(connection, callback);
      },
      function (callback) {
        testUtil.executeCmd(connection, 'alter session set ENABLE_STRUCTURED_TYPES_IN_CLIENT_RESPONSE = true', callback);
      },
      function (callback) {
        testUtil.executeCmd(connection, 'alter session set IGNORE_CLIENT_VESRION_IN_STRUCTURED_TYPES_RESPONSE = true', callback);
      }],
    done
    );
  });

  describe('test object', function () {
    it('test simple object', function (done) {
      const selectObject = 'select {\'string\':\'a\'}::OBJECT(string VARCHAR) as result';

      async.series([
        function (callback) {
          testUtil.executeQueryAndVerify(
            connection,
            selectObject,
            [{ RESULT: { 'string': 'a' } }],
            callback
          );
        }],
      done
      );
    });

    it('test timestamp ltz', function (done) {
      const selectObject = 'select {' +
        '\'timestamp_ltz\': \'2021-12-22 09:43:44.123456\'::TIMESTAMP_LTZ' +
        '}' +
        '::OBJECT(timestamp_ltz TIMESTAMP_LTZ) As RESULT';
      const expected = { timestamp_ltz: '2021-12-22 09:43:44.000 -0800' };
      async.series([
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = {};
              Object.keys(row).forEach((key) => {
                narmalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(narmalizedRow.RESULT, expected);
              callback();
            }
          });
        }
      ],
      done
      );
    });

    it('test timestamp ltz fetch as string', function (done) {
      const selectObject = 'select {' +
        '\'timestamp\': \'2021-12-22 09:43:44\'::TIMESTAMP_LTZ' +
        '}' +
        '::OBJECT(timestamp TIMESTAMP_LTZ) As RESULT';
      const expected = '{"timestamp":"2021-12-22 09:43:44.000 -0800"}';

      async.series([
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            fetchAsString: [snowflake.OBJECT],
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = {};
              Object.keys(row).forEach((key) => {
                narmalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(row.RESULT, expected);
              callback();
            }
          });
        },
      ],
      done
      );
    });

    it('test timestamp ntz', function (done) {
      const selectObject = 'select {' +
        '\'timestamp_ntz\': \'2021-12-22 09:43:44\'::TIMESTAMP_NTZ' +
        '}' +
        '::OBJECT(timestamp_ntz TIMESTAMP_NTZ) AS RESULT';
      const expected = { timestamp_ntz: '2021-12-22 09:43:44.000' };

      async.series([
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = {};
              Object.keys(row).forEach((key) => {
                narmalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(narmalizedRow.RESULT, expected);
              callback();
            }
          });
        },
      ],
      done
      );

    });

    it('test timestamp tz', function (done) {
      const selectObject = 'select {' +
        '\'timestamp_tz\': \'2021-12-24 09:45:45 -0800\'::TIMESTAMP_TZ' +
        '}' +
        '::OBJECT(timestamp_tz TIMESTAMP_TZ) AS RESULT';
      const expected = { timestamp_tz: '2021-12-24 09:45:45.000 -0800' };

      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const normalizedRow = {};
              Object.keys(row).forEach((key) => {
                normalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(normalizedRow.RESULT, expected);
              callback();
            }
          });
        },
      ],
      done
      );

    });

    it('test date', function (done) {
      const selectObject = 'select {' +
        '\'date\': to_date(\'2023-12-24\')::DATE' +
        '}' +
        '::OBJECT(date DATE) AS RESULT';
      const expected = { date: '2023-12-23' };

      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const normalizedRow = {};
              Object.keys(row).forEach((key) => {
                normalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(normalizedRow.RESULT, expected);
              callback();
            }
          });
        },
      ],
      done
      );

    });

    it('test time', function (done) {
      const selectObject = 'select {' +
        '\'time\': \'09:45:45\'::TIME' +
        '}' +
        '::OBJECT(time TIME) AS RESULT';
      const expected = { time: '09:45:45' };

      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const normalizedRow = {};
              Object.keys(row).forEach((key) => {
                normalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(normalizedRow.RESULT, expected);
              callback();
            }
          });
        },
      ],
      done
      );

    });

    it('test binary', function (done) {
      const selectObject = 'select {' +
        '\'binary\': TO_BINARY(\'616263\', \'HEX\')' +
        '}' +
        '::OBJECT(binary BINARY) As RESULT';

      const expected = { RESULT: { 'binary': [97, 98, 99] } };

      async.series([
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = {};
              Object.keys(row).forEach((key) => {
                narmalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(narmalizedRow, expected);
              callback();
            }
          });
        }],
      done
      );
    });

    it('test object all types', function (done) {
      const selectObject = 'select {\'string\': \'a\'' +
        ', \'b\': 1, ' +
        '\'s\': 2, ' +
        '\'i\': 3, ' +
        '\'l\': 4,' +
        ' \'f\': 1.1,' +
        ' \'d\': 2.2,' +
        ' \'bd\': 3.3, ' +
        '\'bool\': true, ' +
        '\'timestamp_ltz\': \'2021-12-22 09:43:44\'::TIMESTAMP_LTZ,' +
        ' \'timestamp_ntz\': \'2021-12-23 09:44:44\'::TIMESTAMP_NTZ, ' +
        '\'timestamp_tz\': \'2021-12-24 09:45:45 -0800\'::TIMESTAMP_TZ,' +
        ' \'date\': \'2023-12-24\'::DATE, ' +
        '\'time\': \'12:34:56\'::TIME, ' +
        '\'binary\': TO_BINARY(\'616263\', \'HEX\') ' +
        '}' +
        '::OBJECT(string VARCHAR' +
        ', b TINYINT, ' +
        's SMALLINT, ' +
        'i INTEGER, ' +
        'l BIGINT, ' +
        'f FLOAT, ' +
        'd DOUBLE, ' +
        'bd DOUBLE, ' +
        'bool BOOLEAN,' +
        'timestamp_ltz TIMESTAMP_LTZ,' +
        'timestamp_ntz TIMESTAMP_NTZ, ' +
        'timestamp_tz TIMESTAMP_TZ, ' +
        'date DATE, time TIME, ' +
        'binary BINARY' +
        ') AS RESULT';

      const expected = {
        RESULT: {
          string: 'a',
          b: 1,
          s: 2,
          i: 3,
          l: 4,
          f: 1.1,
          d: 2.2,
          bd: 3.3,
          bool: true,
          timestamp_ltz: '2021-12-22 09:43:44.000 -0800',
          timestamp_ntz: '2021-12-23 09:44:44.000',
          timestamp_tz: '2021-12-24 09:45:45.000 -0800',
          date: '2023-12-23',
          time: '12:34:56',
          binary: [97, 98, 99]
        }
      };

      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = {};
              Object.keys(row).forEach((key) => {
                narmalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(narmalizedRow, expected);
              callback();
            }
          });
        },
      ],
      done
      );
    });

    it('test object all types fetch as string', function (done) {
      const selectObject = 'select {\'string\': \'a\'' +
        ', \'b\': 1, ' +
        '\'s\': 2, ' +
        '\'i\': 3, ' +
        '\'l\': 4,' +
        ' \'f\': 1.1,' +
        ' \'d\': 2.2,' +
        ' \'bd\': 3.3, ' +
        '\'bool\': true, ' +
        '\'timestamp_ltz\': \'2021-12-22 09:43:44\'::TIMESTAMP_LTZ,' +
        ' \'timestamp_ntz\': \'2021-12-23 09:44:44\'::TIMESTAMP_NTZ, ' +
        '\'timestamp_tz\': \'2021-12-24 09:45:45 -0800\'::TIMESTAMP_TZ,' +
        ' \'date\': \'2023-12-24\'::DATE, ' +
        '\'time\': \'12:34:56\'::TIME, ' +
        '\'binary\': TO_BINARY(\'616263\', \'HEX\') ' +
        '}' +
        '::OBJECT(string VARCHAR' +
        ', b TINYINT, ' +
        's SMALLINT, ' +
        'i INTEGER, ' +
        'l BIGINT, ' +
        'f FLOAT, ' +
        'd DOUBLE, ' +
        'bd DOUBLE, ' +
        'bool BOOLEAN,' +
        'timestamp_ltz TIMESTAMP_LTZ,' +
        'timestamp_ntz TIMESTAMP_NTZ, ' +
        'timestamp_tz TIMESTAMP_TZ, ' +
        'date DATE, time TIME, ' +
        'binary BINARY' +
        ') AS RESULT';

      const expected = {
        'RESULT': '{"string":"a","b":1,"s":2,"i":3,"l":4,"f":1.1,"d":2.2,"bd":3.3,"bool":true,"timestamp_ltz":"2021-12-22 09:43:44.000 -0800","timestamp_ntz":"2021-12-23 09:44:44.000","timestamp_tz":"2021-12-24 09:45:45.000 -0800","date":"2023-12-23","time":"12:34:56","binary":[97,98,99]}'
      };

      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            fetchAsString: [snowflake.OBJECT],
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              assert.deepStrictEqual(row, expected);
              callback();
            }
          });
        },
      ],
      done
      );
    });

    it('test nested object', function (done) {
      const selectObject = 'select {\'inside\': {\'string\':\'a\', \'int\':\'2\', \'timestamp\': \'2021-12-22 09:43:44\'::TIMESTAMP_LTZ}}' +
        '::OBJECT(inside OBJECT(string VARCHAR, int INTEGER, timestamp TIMESTAMP_LTZ)) as result';
      const expected = { RESULT: { 'inside': { 'string': 'a', 'int': 2, 'timestamp': '2021-12-22 09:43:44.000 -0800' } } };
      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = normalize(row);
              assert.deepStrictEqual(narmalizedRow, expected);
              callback();
            }
          });
        },
      ],
      done
      );
    });

    it('test nested object - deeper hierarchy', function (done) {
      const selectObject = 'select {\'inside\': {\'string2\':\'level2\', \'inside2\': {\'string3\':\'a\', \'int\':\'2\', \'timestamp\': \'2021-12-22 09:43:44\'::TIMESTAMP_LTZ}}}' +
        '::OBJECT(inside OBJECT(string2 VARCHAR, inside2 OBJECT(string3 VARCHAR, int INTEGER, timestamp TIMESTAMP_LTZ))) as result';
      const expected = {
        RESULT: {
          'inside': {
            'string2': 'level2',
            'inside2': { 'string3': 'a', 'int': 2, 'timestamp': '2021-12-22 09:43:44.000 -0800' }
          }
        }
      };
      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = normalize(row);
              assert.deepStrictEqual(narmalizedRow, expected);
              callback();
            }
          });
        },
      ],
      done
      );
    });

    it('test object all types', function (done) {
      const selectObject = 'select {\'string\': \'a\'' +
        ', \'b\': 1, ' +
        '\'s\': 2, ' +
        '\'i\': 3, ' +
        '\'l\': 4,' +
        ' \'f\': 1.1,' +
        ' \'d\': 2.2,' +
        ' \'bd\': 3.3, ' +
        '\'bool\': true, ' +
        '\'timestamp_ltz\': \'2021-12-22 09:43:44\'::TIMESTAMP_LTZ,' +
        ' \'timestamp_ntz\': \'2021-12-23 09:44:44\'::TIMESTAMP_NTZ, ' +
        '\'timestamp_tz\': \'2021-12-24 09:45:45 -0800\'::TIMESTAMP_TZ,' +
        ' \'date\': \'2023-12-24\'::DATE, ' +
        '\'time\': \'12:34:56\'::TIME, ' +
        '\'binary\': TO_BINARY(\'616263\', \'HEX\') ' +
        '}' +
        '::OBJECT(string VARCHAR' +
        ', b TINYINT, ' +
        's SMALLINT, ' +
        'i INTEGER, ' +
        'l BIGINT, ' +
        'f FLOAT, ' +
        'd DOUBLE, ' +
        'bd DOUBLE, ' +
        'bool BOOLEAN,' +
        'timestamp_ltz TIMESTAMP_LTZ,' +
        'timestamp_ntz TIMESTAMP_NTZ, ' +
        'timestamp_tz TIMESTAMP_TZ, ' +
        'date DATE, time TIME, ' +
        'binary BINARY' +
        ') AS RESULT';

      const expected = {
        RESULT: {
          string: 'a',
          b: 1,
          s: 2,
          i: 3,
          l: 4,
          f: 1.1,
          d: 2.2,
          bd: 3.3,
          bool: true,
          timestamp_ltz: '2021-12-22 09:43:44.000 -0800',
          timestamp_ntz: '2021-12-23 09:44:44.000',
          timestamp_tz: '2021-12-24 09:45:45.000 -0800',
          date: '2023-12-23',
          time: '12:34:56',
          binary: [97, 98, 99]
        }
      };

      async.series([
        function (callback) {
          testUtil.executeCmd(connection, sharedStatement.setTimezoneAndTimestamps, callback);
        },
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedRow = {};
              Object.keys(row).forEach((key) => {
                narmalizedRow[key] = testUtil.normalizeRowObject(row[key]);
              });
              assert.deepStrictEqual(narmalizedRow, expected);
              callback();
            }
          });
        },
      ],
      done
      );
    });
  });

  describe('test array', function () {

    it('test simple array of varchar', function (done) {
      const selectObject = 'SELECT ARRAY_CONSTRUCT(\'one\', \'two\', \'three\')::ARRAY(VARCHAR) AS RESULT';

      async.series([
        function (callback) {
          testUtil.executeQueryAndVerify(
            connection,
            selectObject,
            [{ RESULT: ['one', 'two', 'three'] }],
            callback
          );
        }],
      done
      );
    });

    it('test simple array of integer', function (done) {
      const selectObject = 'SELECT ARRAY_CONSTRUCT(1, 2, 3)::ARRAY(INTEGER) AS RESULT';

      async.series([
        function (callback) {
          testUtil.executeQueryAndVerify(
            connection,
            selectObject,
            [{ RESULT: [1, 2, 3] }],
            callback
          );
        }],
      done
      );
    });

    it('test simple array of timestamp_ltz', function (done) {
      const selectObject = 'SELECT ARRAY_CONSTRUCT(\'2021-12-22 09:43:44.123456\', \'2021-12-22 09:43:45.123456\')::ARRAY(TIMESTAMP_LTZ) AS kaka';

      const expected = ['2021-12-22 09:43:44.000 -0800', '2021-12-22 09:43:45.000 -0800'];
      async.series([
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedArray = [];
              row.KAKA.forEach((value) => {
                narmalizedArray.push(testUtil.normalizeValue(value));
              });
              assert.deepStrictEqual(narmalizedArray, expected);
              callback();
            }
          });
        }
      ],
      done
      );
    });

    it('test simple array of timestamp_ntz', function (done) {
      const selectObject = 'SELECT ARRAY_CONSTRUCT(\'2021-12-22 09:43:44\', \'2021-12-22 09:43:45\')::ARRAY(TIMESTAMP_NTZ) AS result';

      const expected = ['2021-12-22 09:43:44.000', '2021-12-22 09:43:45.000'];
      async.series([
        function (callback) {
          connection.execute({
            sqlText: selectObject,
            complete: function (err, stmt, rows) {
              testUtil.checkError(err);
              const row = rows[0];
              const narmalizedArray = [];
              row.RESULT.forEach((value) => {
                narmalizedArray.push(testUtil.normalizeValue(value));
              });
              assert.deepStrictEqual(narmalizedArray, expected);
              callback();
            }
          });
        }
      ],
      done
      );
    });

  });
});
