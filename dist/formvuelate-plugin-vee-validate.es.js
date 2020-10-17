/**
 * @formvuelate/plugin-vee-validate v1.0.0
 * (c) 2020 Abdelrahman Awad <logaretm1@gmail.com>
 * @license MIT
 */

import { computed, getCurrentInstance, h, markRaw, toRefs, watch } from 'vue';
import { useField, useForm } from 'vee-validate';

/**
 * For a Schema, find the elements in each of the rows and remap the element with the given function
 * @param {Array} schema
 * @param {Function} fn
 *
 * @returns {Array}
 */
var mapElementsInSchema = function (schema, fn) { return schema.map(function (row) { return row.map(function (el) { return fn(el); }); }); };

function VeeValidatePluginFactory () {
  return function VeeValidatePlugin(baseReturns) {
    // Take the parsed schema from SchemaForm setup returns
    var parsedSchema = baseReturns.parsedSchema;
    var formBinds = baseReturns.formBinds;
  
  
    // Get additional properties not defined on the `SchemaForm` derivatives
    var ref = getCurrentInstance();
    var formAttrs = ref.attrs;
    // Create a form context and inject the validation schema if needed
    var ref$1 = useForm({
      validationSchema: formAttrs['validation-schema'] || formAttrs['validationSchema']
    });
    var handleSubmit = ref$1.handleSubmit;
    // Map components in schema to enhanced versions with `useField`
    var formSchema = mapElementsInSchema(parsedSchema.value, function (el) {
      return Object.assign({}, el,
        {component: markRaw(withField(el.component))})
    });

    var boundSubmit = formBinds.value.onSubmit;  
    var onSubmit = handleSubmit(function (_, ref) {
      var evt = ref.evt;

      boundSubmit(evt);
    });
  
    return Object.assign({}, baseReturns,
      {formBinds: computed(function () {
        return Object.assign({}, baseReturns.formBinds.value,
          {onSubmit: onSubmit})
      }),
      parsedSchema: computed(function () { return formSchema; })})
  }
} 

function withField (Comp) {
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

      var ref$1 = toRefs(props);
      var validations = ref$1.validations;
      var modelValue = ref$1.modelValue;
      var model = ref$1.model;
      var fieldName = model ? model.value : attrs.model;
      var initialValue = modelValue ? modelValue.value : undefined;
      var ref$2 = useField(fieldName, validations || attrs.rules, {
        initialValue: initialValue
      });
      var value = ref$2.value;
      var errorMessage = ref$2.errorMessage;
      
      if (modelValue) {
        watch(modelValue, function (val) {
          value.value = val;
        });
      }


      return function renderWithField() {
        return h(Comp, Object.assign({}, props,
          attrs,
          {errorMessage: errorMessage.value}))
      }
    },
  }
}

export { mapElementsInSchema, withField };
export default VeeValidatePluginFactory;
