import { toRefs, h, computed, markRaw, watch, getCurrentInstance, unref } from 'vue'
import { useForm, useField } from 'vee-validate';

/**
 * For a Schema, find the elements in each of the rows and remap the element with the given function
 * @param {Array} schema
 * @param {Function} fn
 *
 * @returns {Array}
 */
export const mapElementsInSchema = (schema, fn) => schema.map(row => row.map(el => fn(el)))

/**
 * Maps the validation state to props
 */
function defaultMapProps(validation, el) {
  return {
    validation,
  };
}

export default function VeeValidatePlugin(opts) {
  // Maps the validation state exposed by vee-validate to components
  const mapProps = (opts && opts.mapProps) || defaultMapProps

  return function veeValidatePlugin(baseReturns) {
  // Take the parsed schema from SchemaForm setup returns
    const { parsedSchema, formBinds } = baseReturns

    // Get additional properties not defined on the `SchemaForm` derivatives
    const { attrs: formAttrs } = getCurrentInstance();
    // Create a form context and inject the validation schema if provided
    const { handleSubmit } = useForm({
      validationSchema: formAttrs['validation-schema'] || formAttrs['validationSchema']
    });

    // Map components in schema to enhanced versions with `useField`
    const formSchema = mapElementsInSchema(parsedSchema.value, el => {
      return {
        ...el,
        component: markRaw(withField(el, mapProps))
      }
    })

    // override the submit function with one that triggers validation
    const formSubmit = formBinds.value.onSubmit;  
    const onSubmit = handleSubmit((_, { evt }) => {
      formSubmit(evt);
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
}

export function withField(el, mapProps) {
  const Comp = el.component;

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
      const { validations, modelValue } = toRefs(props)
      const initialValue = modelValue ? modelValue.value : undefined
      const { value, errorMessage, meta, setDirty, setTouched, errors } = useField(attrs.model, validations, {
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
          ...mapProps({
            errorMessage: unref(errorMessage),
            errors: unref(errors),
            meta,
            setDirty,
            setTouched,
          }, el)
        })
      }
    },
  }
}
