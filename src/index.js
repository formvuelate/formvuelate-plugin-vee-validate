import { toRefs, h, computed, markRaw, watch, getCurrentInstance } from 'vue'
import { useForm, useField } from 'vee-validate';

/**
 * For a Schema, find the elements in each of the rows and remap the element with the given function
 * @param {Array} schema
 * @param {Function} fn
 *
 * @returns {Array}
 */
export const mapElementsInSchema = (schema, fn) => schema.map(row => row.map(el => fn(el)))

export default function VeeValidatePlugin (baseReturns) {
  // Take the parsed schema from SchemaForm setup returns
  const { parsedSchema, formBinds } = baseReturns

  // Get additional properties not defined on the `SchemaForm` derivatives
  const { attrs: formAttrs } = getCurrentInstance();
  // Create a form context and inject the validation schema if needed
  const { handleSubmit } = useForm({
    validationSchema: formAttrs['validation-schema'] || formAttrs['validationSchema']
  });
  // Map components in schema to enhanced versions with `useField`
  const formSchema = mapElementsInSchema(parsedSchema.value, el => {
    return {
      ...el,
      component: markRaw(withField(el.component))
    }
  })

  const boundSubmit = formBinds.value.onSubmit;  
  const onSubmit = handleSubmit((_, { evt }) => {
    boundSubmit(evt);
  });

  return {
    ...baseReturns,
    formBinds: computed(() => {
      return {
        ...baseReturns.formBinds.value,
        onSubmit,
      }
    }),
    parsedSchema: computed(() => formSchema)
  }
}

export function withField (Comp) {
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
    setup (props, { attrs }) {
      const { validations, modelValue, model } = toRefs(props)
      const fieldName = model ? model.value : attrs.model
      const initialValue = modelValue ? modelValue.value : undefined
      const { value, errorMessage } = useField(fieldName, validations || attrs.rules, {
        initialValue
      })
      
      if (modelValue) {
        watch(modelValue, (val) => {
          value.value = val
        })
      }


      return function renderWithField() {
        return h(Comp, {
          ...props,
          ...attrs,
          errorMessage: errorMessage.value
        })
      }
    },
  }
}
