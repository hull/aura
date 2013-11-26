(function() {
  // if (window.jQuery) {
  //   define('jquery', [], function () {
  //     return window.jQuery;
  //   });
  // } else {
  //   require.config({
  //     paths: {
  //       jquery:     'bower_components/jquery/jquery'
  //     },
  //     shim: {
  //       jquery:     { exports: '$' }
  //     }
  //   });
  // }

  if (window._) {
    define('underscore', [], function () {
      return window._;
    });
  } else {
    require.config({
      paths: {
        underscore: 'bower_components/underscore/underscore'
      },
      shim: {
        underscore: { exports: '_' }
      }
    });
  }

  require.config({
    paths:{
      q: 'bower_components/q/q'
    }
  });

  define(['module', 'underscore', './platform', 'q'], function(module, _, platform, Q) {

    // Auto configure aura path... if not set yet...
    if (!require.s.contexts._.config.paths.aura) {
      require.config({ paths: { aura: module.id.replace(/base$/, '') }});
    }

    var base = {};

    base.dom = {
      find: function(selector, context) {
        context = context || document;
        return $(context).find(selector);
      },
      data: function(selector, attribute) {
        return $(selector).data(attribute);
      }
    };
    
    base.data = {
      deferred   : Q.defer,
      when       : Q.when,
      all        : Q.all,
      allSettled : Q.allSettled
    };

    base.util = {
      each: _.each,
      extend: _.extend,
      uniq: _.uniq,
      _: _,
      decamelize: function(camelCase, delimiter) {
        delimiter = (delimiter === undefined) ? '_' : delimiter;
        return camelCase.replace(/([A-Z])/g, delimiter + '$1').toLowerCase();
      }
    };

    base.events = {
      // listen: function(context, events, selector, callback) {
      //   return $(context).on(events, selector, callback);
      // },
      bindAll: function() {
        return _.bindAll.apply(this, arguments);
      }
    };

    base.template = {
      parse: _.template
    };

    return base;

  });

})();
