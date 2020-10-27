/**
 * @formvuelate/plugin-vee-validate v1.0.1
 * (c) 2020 Abdelrahman Awad <logaretm1@gmail.com>
 * @license MIT
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vue'), require('vee-validate')) :
	typeof define === 'function' && define.amd ? define(['exports', 'vue', 'vee-validate'], factory) :
	(factory((global['@formvuelate/pluginVeeValidate'] = {}),global.Vue,global.VeeValidate));
}(this, (function (exports,vue,veeValidate) { 'use strict';

/**
 * For a Schema, find the elements in each of the rows and remap the element with the given function
 * @param {Array} schema
 * @param {Function} fn
 *
 * @returns {Array}
 */
var mapElementsInSchema = function (schema, fn) { return schema.map(function (row) { return row.map(function (el) { return fn(el); }); }); };

/**
 * Maps the validation state to props
 */
function defaultMapProps(validation) {
  return {
    validation: validation,
  };
}

function VeeValidatePlugin(opts) {
  // Maps the validation state exposed by vee-validate to components
  var mapProps = (opts && opts.mapProps) || defaultMapProps;

  return function veeValidatePlugin(baseReturns) {
  // Take the parsed schema from SchemaForm setup returns
    var parsedSchema = baseReturns.parsedSchema;
    var formBinds = baseReturns.formBinds;

    // Get additional properties not defined on the `SchemaForm` derivatives
    var ref = vue.getCurrentInstance();
    var formAttrs = ref.attrs;
    // Create a form context and inject the validation schema if provided
    var ref$1 = veeValidate.useForm({
      validationSchema: formAttrs['validation-schema'] || formAttrs['validationSchema']
    });
    var handleSubmit = ref$1.handleSubmit;

    // Map components in schema to enhanced versions with `useField`
    var formSchema = mapElementsInSchema(parsedSchema.value, function (el) {
      return Object.assign({}, el,
        {component: vue.markRaw(withField(el, mapProps))})
    });

    // override the submit function with one that triggers validation
    var formSubmit = formBinds.value.onSubmit;  
    var onSubmit = handleSubmit(function (_, ref) {
      var evt = ref.evt;

      formSubmit(evt);
    });

    return Object.assign({}, baseReturns,
      {formBinds: vue.computed(function () {
        return Object.assign({}, baseReturns.formBinds.value,
          {onSubmit: onSubmit})
      }),
      parsedSchema: vue.computed(function () { return formSchema; })})
  }
}

function withField(el, mapProps) {
  var Comp = el.component;

  return {
    name: 'withFieldWrapper',
    props: {
      modelValue: {
        type: [String, Number],
        default: undefined,
      },
      validations: {
        type: [String, Object, Function],
        default: undefined,
      }
    },
    setup: function setup (props, ref) {
      var attrs = ref.attrs;

      var ref$1 = vue.toRefs(props);
      var validations = ref$1.validations;
      var modelValue = ref$1.modelValue;
      var initialValue = modelValue ? modelValue.value : undefined;
      var ref$2 = veeValidate.useField(attrs.model, validations, {
        initialValue: initialValue
      });
      var value = ref$2.value;
      var errorMessage = ref$2.errorMessage;
      var meta = ref$2.meta;
      var setDirty = ref$2.setDirty;
      var setTouched = ref$2.setTouched;
      var errors = ref$2.errors;
      
      if (modelValue) {
        vue.watch(modelValue, function (val) {
          value.value = val;
        });
      }


      return function renderWithField() {
        return vue.h(Comp, Object.assign({}, props,
          attrs,
          mapProps({
            errorMessage: vue.unref(errorMessage),
            errors: vue.unref(errors),
            meta: meta,
            setDirty: setDirty,
            setTouched: setTouched,
          }, el)))
      }
    },
  }
}

exports.mapElementsInSchema = mapElementsInSchema;
exports['default'] = VeeValidatePlugin;
exports.withField = withField;

Object.defineProperty(exports, '__esModule', { value: true });

})));
