'use strict';
var hmr = module.exports = {};

/**
 * Modify the Angular global object for HMR.
 */
hmr.modifyAngular = function() {
    var origAngularModule = angular.extend(angular.module, {});
    angular.module = function(name, requires, configFn) {
        var mod = origAngularModule(name, requires, configFn);
        mod.serviceCache = mod.serviceCache || {};

        mod.origAngularController = mod.origAngularController || angular.extend(mod.controller, {});
        mod.controller = function(controllerName, controllerFunction) {
            var self = this;
            var exists = !!mod.serviceCache[controllerName];
            mod.serviceCache[controllerName] = controllerFunction;
            if (exists && getInjector()) {
                refreshState();
            }
            else if (!exists) {
                mod.origAngularController(controllerName, function($scope, $injector) {
                    var vm = this;

                    $injector.invoke(mod.serviceCache[controllerName], vm, {
                        '$scope': $scope
                    });
                });
            }
            return mod;
        };

        mod.origAngularService = mod.origAngularService || angular.extend(mod.service, {});
        mod.service = function(recipeName, serviceFunction) {
            var exists = mod.serviceCache[recipeName];
            if (exists && getInjector()) {
                mod.serviceCache[recipeName].resetObject();
                var returnedValue = getInjector().invoke(serviceFunction, mod.serviceCache[recipeName].$delegate);
                if (returnedValue) {
                    angular.extend(mod.serviceCache[recipeName].$delegate, returnedValue);
                }

                refreshState();
            }
            else {
                mod.origAngularService(recipeName, serviceFunction);
                mod.config(function($provide) {
                    $provide.decorator(recipeName, function($delegate) {
                        var delegateContainer = {
                            $delegate: $delegate,
                            resetObject: function() {
                                for (var prop in this.$delegate) {
                                    delete this.$delegate[prop];
                                }
                            }
                        };
                        mod.serviceCache[recipeName] = delegateContainer;
                        return mod.serviceCache[recipeName].$delegate;
                    });
                });
            }
            return mod;
        };

        mod.origAngularFactory = mod.origAngularFactory || angular.extend(mod.factory, {});
        mod.factory = function(recipeName, factoryFunction) {
            var exists = mod.serviceCache[recipeName];
            if (exists && getInjector()) {
                mod.serviceCache[recipeName].resetObject();
                var returnedValue = getInjector().invoke(factoryFunction);
                if (returnedValue) {
                    angular.extend(mod.serviceCache[recipeName], returnedValue);
                }


                refreshState();
            }
            else {
                mod.origAngularFactory(recipeName, factoryFunction);
                mod.config(function($provide) {
                    $provide.decorator(recipeName, function($delegate) {
                        var delegateContainer = {
                            $delegate: $delegate,
                            resetObject: function() {
                                for (var prop in this) {
                                    delete this.$delegate[prop];
                                }
                            }
                        };
                        mod.serviceCache[recipeName] = delegateContainer;
                        return mod.serviceCache[recipeName].$delegate;
                    });
                });
            }
            return mod;
        };

        mod.origAngularFilter = mod.origAngularFilter || angular.extend(mod.filter, {});
        mod.filter = function(recipeName, filterFunction) {
            var exists = !!mod.serviceCache[recipeName];
            if (exists && getInjector()) {
                mod.serviceCache[recipeName] = getInjector().invoke(filterFunction);
                refreshState();
            }
            else {
                mod.origAngularFilter(recipeName, function($injector) {
                    mod.serviceCache[recipeName] = $injector.invoke(filterFunction, this);
                    var func = function() {
                        return mod.serviceCache[recipeName].apply(this, arguments);
                    };
                    return func;
                });
            }
            return mod;
        };

        mod.origAngularDirective = mod.origAngularDirective || angular.extend(mod.directive, {});
        mod.directive = function(recipeName, directiveFunction) {
            var exists = !!mod.serviceCache[recipeName];
            if (exists && getInjector()) {
                mod.serviceCache[recipeName].resetObject();
                var returnedValue = getInjector().invoke(directiveFunction);
                angular.extend(mod.serviceCache[recipeName], returnedValue);
                refreshState();
            }
            else {
                mod.origAngularDirective(recipeName, function($injector) {
                    var obj = $injector.invoke(directiveFunction, this);
                    obj.resetObject = function() {
                        for (var prop in this) {
                            console.log(prop);
                            if (prop !== 'resetObject' && prop !== 'priority' && prop !== 'index' && prop !== 'name' && prop !== 'require' && prop !== 'restrict' && prop !== '$$bindings' && prop !== '$$moduleName') {
                                delete this[prop];
                            }
                        }
                    };
                    mod.serviceCache[recipeName] = obj;

                    return mod.serviceCache[recipeName];
                });
            }
            return mod;
        };
        return mod;
    };
};

/**
 * Update the template cache with all templates
 */
hmr.acceptTemplateChange = function(templateRequire) {
    var $templateCache = getInjector().get('$templateCache');
    angular.forEach(templateRequire.keys(), function(key) {
        var val = templateRequire(key);
        $templateCache.put(key, val);
    });
    refreshState();
};




//Private
function getInjector() {
    return angular.element(document.body).injector();
}

function refreshState() {
    var $state = getInjector().get('$state');
    $state.transitionTo($state.current, $state.params, {
        reload: true,
        inherit: false,
        notify: true
    });
}
