# angular-webpack-hmr
Hot Module Replacement Angular Modifications for Angular 1


## Usage
This project contains two separate functions:
 - modifyAngular: This modifies the global angular object to allow for renewal of angular components for hot module replacement.
 - acceptTemplateChange: This should be used when a template changes while listening for template changes. It will renew the cache.

To use these, make sure that you are requiring the contexts of all the various components. In your code, place:

```
if (module.hot) {
    require('angular-webpack-hmr').modifyAngular();
}
```
