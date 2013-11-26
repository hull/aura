define(['./base', './logger'], function(base, Logger) {

  var _ = base.util._,
      slice = Array.prototype.slice,
      deferred = base.data.deferred,
      when     = base.data.when,
      all      = base.data.all,
      allSettled      = base.data.allSettled,
      logger   = new Logger('Extensions').enable();

  function ExtManager() {
    this._extensions  = [];
    this.initStatus   = deferred();
    return this;
  }

  //---------------------------------------------------------------------------
  // Public API
  //---------------------------------------------------------------------------

  ExtManager.prototype.add = function(ext) {
    if (_.include(this._extensions, ext)) {
      var msg =  ext.ref.toString() + " is already registered.";
          msg += "Extensions can only be added once.";
      throw new Error(msg);
    }

    if (this.initStarted) {
      throw new Error("Init extensions already called");
    }

    this._extensions.push(ext);
    return this;
  };

  ExtManager.prototype.onReady = function(fn) {
    this.initStatus.promise.then(fn);
    return this;
  };

  ExtManager.prototype.onFailure = function(fn) {
    this.initStatus.promise.fail(fn);
    return this;
  };

  ExtManager.prototype.init = function() {

    if (this.initStarted) {
      throw new Error("Init extensions already called");
    }

    this.initStarted = true;

    var extensions    = _.compact(this._extensions.slice(0)),
        initialized   = [],
        initStatus    = this.initStatus;

    // Enforce sequencial loading of extensions.
    // The `initStatus` promise resolves to the
    // actually resolved and loaded extensions.
    (function _init(extDef) {
      if (extDef) {
        var ext = initExtension(extDef);
        initialized.push(ext);

        ext.then(function () {
          _init(extensions.shift());
        }, function (err) {
          if (!err) {
            err = "Unknown error while loading an extension";
          }
          if (!(err instanceof Error)) {
            err = new Error(err);
          }
          initStatus.reject(err);
        });

      } else if (extensions.length === 0) {

        all(initialized).spread(function () {
          initStatus.resolve(slice.call(arguments));
        },function(){
          console.log('Error while resolving all extensions');
        }).done();

      }
    })(extensions.shift());

    return initStatus.promise;
  };

  //---------------------------------------------------------------------------
  // Private API
  //---------------------------------------------------------------------------

  /*!
   * Helper function that returns the first function found among its arguments.
   * If no function if found, it return a noop (empty function).
   *
   * @return {[type]} [description]
   */
  function getFn() {
    var funcs = slice.call(arguments), fn;
    for (var f = 0, l = funcs.length; f < l; f++) {
      fn = funcs[f];
      if (typeof(fn) === 'function') { return fn; }
    }
    return function () {};
  }

  /*!
   * If the value of the first argument is a function then invoke
   * it with the rest of the args, otherwise, return it.
   */
  function getVal(val) {
    if (typeof val === 'function') {
      return val.apply(undefined, slice.call(arguments, 1));
    } else {
      return val;
    }
  }

  /*!
  * Actual extension loading.
  *
  * The sequence is:
  *
  * * resolves the extension reference
  * * register and requires its dependencies if any
  * * init the extension
  *
  * This method also returns a promise that allows
  * to keep track of the app's loading sequence.
  *
  * If the extension provides a `afterAppStart` method,
  * the promise will resolve to that function that
  * will be called at the end of the app loading sequence.
  *
  * @param {String|Object|Function} extDef the reference and context of the extension
  */

  function initExtension(extDef) {
    var dfd       = deferred(),
        ref       = extDef.ref,
        context   = extDef.context;

    var req = requireExtension(ref, context);
    req.then(function (ext) {

      // The extension did not return anything,
      // but probably already did what it had to do.
      if (!ext) { return dfd.resolve(); }

      // Let's initialize it then...
      // If ext is a function, call it
      // Else If ext has a init method, call it
      var initializeFn = getFn(ext, ext.initialize);
      var initialize = initializeFn(context);
      var init = when(initialize,function () {
        dfd.resolve(ext);
      }, function(err){
        dfd.reject(err);
      });
    }, dfd.reject).done();
    return dfd.promise;
  }

  /*!
  * Extension resolution before actual loading.
  * If `ext` is a String, it is considered as a reference
  * to an AMD module that has to be loaded.
  *
  * This method returns a promise that resolves to the actual extension,
  * With all its dependencies already required' too.
  *
  * @param {String|Object|Function} ext the reference of the extension
  * @param {Object} context the thing this extension is supposed to extend
  */

  function requireExtension(ext, context) {
    var dfd = deferred();

    var resolve = function (ext) {
      ext = getVal(ext, context);
      if (ext && ext.require && ext.require.paths) {
        var deps = _.keys(ext.require.paths) || [];
        require.config(ext.require);
        require(deps, function() {
          dfd.resolve(ext);
        }, reject);
      } else {
        dfd.resolve(ext);
      }
    };

    var reject = function (err) {
      logger.error("Error loading ext:", ext, err);
      dfd.reject(err);
    };

    if (typeof ext === 'string') {
      require([ext], resolve, reject);
    } else {
      resolve(ext);
    }

    return dfd.promise;
  }

  return ExtManager;
});
