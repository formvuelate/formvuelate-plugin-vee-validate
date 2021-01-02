/**
 * @formvuelate/plugin-vee-validate v1.0.3
 * (c) 2020 Abdelrahman Awad <logaretm1@gmail.com>
 * @license MIT
 */

import { computed, getCurrentInstance, h, markRaw, resolveDynamicComponent, toRefs, unref, watch } from 'vue';
import { useField, useForm } from 'vee-validate';

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
function defaultMapProps (validation) {
  return {
    validation: validation
  }
}

function VeeValidatePlugin (opts) {
  // Maps the validation state exposed by vee-validate to components
  var mapProps = (opts && opts.mapProps) || defaultMapProps;

  return function veeValidatePlugin (baseReturns) {
  // Take the parsed schema from SchemaForm setup returns
    var parsedSchema = baseReturns.parsedSchema;
    var formBinds = baseReturns.formBinds;

    // Get additional properties not defined on the `SchemaForm` derivatives
    var ref = getCurrentInstance();
    var formAttrs = ref.attrs;
    // Create a form context and inject the validation schema if provided
    var ref$1 = useForm({
      validationSchema: formAttrs['validation-schema'] || formAttrs.validationSchema,
      initialErrors: formAttrs['initial-errors'] || formAttrs.initialErrors,
      initialDirty: formAttrs['initial-dirty'] || formAttrs.initialDirty,
      initialTouched: formAttrs['initial-touched'] || formAttrs.initialTouched
    });
    var handleSubmit = ref$1.handleSubmit;

    function mapField (el, path) {
      if ( path === void 0 ) path = '';

      // Handles nested schemas
      // doesn't treat nested forms as fields
      // instead goes over their fields and maps them recursively
      if (el.schema) {
        path = path ? (path + "." + (el.model)) : el.model;

        // Make sure we only deal with schema arrays and not nested objects
        var schemaArray = Array.isArray(el.schema) ? el.schema : Object.keys(el.schema).map(function (model) {
          return Object.assign({}, {model: model},
            el.schema[model])
        });

        return Object.assign({}, el, {
          schema: schemaArray.map(function (nestedField) { return mapField(nestedField, path); })
        })
      }

      return Object.assign({}, el, {
        component: markRaw(withField(el, mapProps, path))
      })
    }

    // Map components in schema to enhanced versions with `useField`
    var formSchema = mapElementsInSchema(parsedSchema.value, mapField);

    // override the submit function with one that triggers validation
    var formSubmit = formBinds.value.onSubmit;
    var onSubmit = handleSubmit(function (_, ref) {
      var evt = ref.evt;

      formSubmit(evt);
    });

    return Object.assign({}, baseReturns,
      {formBinds: computed(function () {
        return Object.assign({}, baseReturns.formBinds.value,
          {onSubmit: onSubmit})
      }),
      parsedSchema: computed(function () { return formSchema; })})
  }
}

function withField (el, mapProps, path) {
  if ( path === void 0 ) path = '';

  var Comp = el.component;

  return {
    name: 'withFieldWrapper',
    props: {
      modelValue: {
        type: [String, Number],
        default: undefined
      },
      validations: {
        type: [String, Object, Function],
        default: undefined
      }
    },
    setup: function setup (props, ref) {
      var attrs = ref.attrs;

      var ref$1 = toRefs(props);
      var validations = ref$1.validations;
      var modelValue = ref$1.modelValue;
      var initialValue = modelValue ? modelValue.value : undefined;
      // Build a fully qualified field name using dot notation for nested fields
      // ex: user.name
      var name = path ? (path + "." + (attrs.model)) : attrs.model;
      var ref$2 = useField(name, validations, {
        initialValue: initialValue
      });
      var value = ref$2.value;
      var errorMessage = ref$2.errorMessage;
      var meta = ref$2.meta;
      var setDirty = ref$2.setDirty;
      var setTouched = ref$2.setTouched;
      var errors = ref$2.errors;

      if (modelValue) {
        watch(modelValue, function (val) {
          value.value = val;
        });
      }

      return function renderWithField () {
        return h(resolveDynamicComponent(Comp), Object.assign({}, props,
          attrs,
          mapProps({
            errorMessage: unref(errorMessage),
            errors: unref(errors),
            meta: meta,
            setDirty: setDirty,
            setTouched: setTouched
          }, el)))
      }
    }
  }
}

export { mapElementsInSchema, withField };
export default VeeValidatePlugin;
