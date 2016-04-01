var utils = require('shipit-utils');
var chalk = require('chalk');
var _ = require('lodash');
var util = require('util');
var init = require('../../lib/init');
var Promise = require('bluebird');
var path = require('path2/posix');

/**
 * Create required directories for linked files and dirs.
 */

module.exports = function(gruntOrShipit) {

  var task = function task() {
    var shipit = utils.getShipit(gruntOrShipit);
    var remote = true;
    var method = remote ? 'remote' : 'local';

    var getPathStr = function(el, basePath) {
      basePath = basePath || shipit.config.shared.basePath;
      var filePath = shipit.config.shared.remote ? path.join(basePath, el.path) : el.path;

      return el.isFile ? util.format('$(dirname %s)', filePath) : filePath;
    };

    var createMultipleDirs = function (els) {
      var successMsg = 'Directory created on %s: %s.';
      var errorMsg = 'Could not create directory on %s: %s.';
      var sharedDirs = [];
      var targetDirs = [];

      _.forEach(els, function (el) {
        sharedDirs.push(getPathStr(el));
        targetDirs.push(getPathStr(el, shipit.releasePath));
      });
      targetDirs = targetDirs.join(' ');
      sharedDirs = sharedDirs.join(' ');

      return shipit[shipit.config.shared.shipitMethod](util.format('mkdir -p %s', sharedDirs))
          .then(function() {
            shipit.log(chalk.green(util.format(successMsg, shipit.config.shared.shipitMethod, sharedDirs)));
          }, function() {
            shipit.log(chalk.red(util.format(errorMsg, shipit.config.shared.shipitMethod, sharedDirs)));
          })
          .then(function() {
            if (shipit.config.shared.remote && shipit.releasePath) {
              return shipit.remote(util.format('mkdir -p %s', targetDirs))
                  .then(function() {
                    shipit.log(chalk.green(util.format(successMsg, shipit.config.shared.shipitMethod, targetDirs)));
                  }, function() {
                    shipit.log(chalk.red(util.format(errorMsg, shipit.config.shared.shipitMethod, targetDirs)));
                  });
            }

            return Promise.resolve();
          });
    };

    var createDir = function createDir(el) {
      var successMsg = 'Directory created on %s: %s.';
      var errorMsg = 'Could not create directory on %s: %s.';
      var srcPath = path.join(shipit.config.shared.basePath, el.path);
      var targetPath;

      return shipit[shipit.config.shared.shipitMethod](
        util.format('mkdir -p %s', getPathStr(el))
      )
      .then(function() {
        shipit.log(chalk.green(util.format(successMsg, shipit.config.shared.shipitMethod, srcPath)));
      }, function() {
        shipit.log(chalk.red(util.format(errorMsg, shipit.config.shared.shipitMethod, srcPath)));
      })
      .then(function() {
        if (shipit.config.shared.remote && shipit.releasePath) {
          targetPath = path.join(shipit.releasePath, el.path);

          return shipit.remote(
            util.format('mkdir -p %s', getPathStr(el, shipit.releasePath))
          )
          .then(function() {
            shipit.log(chalk.green(util.format(successMsg, shipit.config.shared.shipitMethod, targetPath)));
          }, function() {
            shipit.log(chalk.red(util.format(errorMsg, shipit.config.shared.shipitMethod, targetPath)));
          });
        }

        return Promise.resolve();
      });
    };

    return init(shipit)
        .then(function(shipit) {
          shipit.log(util.format('Creating shared directories on %s.', shipit.config.shared.shipitMethod));

          return createMultipleDirs(shipit.config.shared.dirs)
              .then(function () {
                return createMultipleDirs(shipit.config.shared.files);
              })
              .then(function() {
                shipit.emit('sharedDirsCreated');
              });
        });
  };

  utils.registerTask(gruntOrShipit, 'shared:create-dirs', task);
};
