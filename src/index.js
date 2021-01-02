import { toRefs, h, computed, markRaw, watch, getCurrentInstance, unref, resolveDynamicComponent } from 'vue'
import { useForm, useField } from 'vee-validate'

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
function defaultMapProps (validation) {
  return {
    validation
  }
}

export default function VeeValidatePlugin (opts) {
  // Maps the validation state exposed by vee-validate to components
  const mapProps = (opts && opts.mapProps) || defaultMapProps

  return function veeValidatePlugin (baseReturns) {
  // Take the parsed schema from SchemaForm setup returns
    const { parsedSchema, formBinds } = baseReturns

    // Get additional properties not defined on the `SchemaForm` derivatives
    const { attrs: formAttrs } = getCurrentInstance()
    // Create a form context and inject the validation schema if provided
    const { handleSubmit } = useForm({
      validationSchema: formAttrs['validation-schema'] || formAttrs.validationSchema,
      initialErrors: formAttrs['initial-errors'] || formAttrs.initialErrors,
      initialDirty: formAttrs['initial-dirty'] || formAttrs.initialDirty,
      initialTouched: formAttrs['initial-touched'] || formAttrs.initialTouched
    })

    function mapField (el, path = '') {
      // Handles nested schemas
      // doesn't treat nested forms as fields
      // instead goes over their fields and maps them recursively
      if (el.schema) {
        path = path ? `${path}.${el.model}` : el.model

        // Make sure we only deal with schema arrays and not nested objects
        const schemaArray = Array.isArray(el.schema) ? el.schema : Object.keys(el.schema).map(model => {
          return {
            model,
            ...el.schema[model]
          }
        })

        return Object.assign({}, el, {
          schema: schemaArray.map(nestedField => mapField(nestedField, path))
        })
      }

      return Object.assign({}, el, {
        component: markRaw(withField(el, mapProps, path))
      })
    }

    // Map components in schema to enhanced versions with `useField`
    const formSchema = mapElementsInSchema(parsedSchema.value, mapField)

    // override the submit function with one that triggers validation
    const formSubmit = formBinds.value.onSubmit
    const onSubmit = handleSubmit((_, { evt }) => {
      formSubmit(evt)
    })

    return {
      ...baseReturns,
      formBinds: computed(() => {
        return {
          ...baseReturns.formBinds.value,
          onSubmit
        }
      }),
      parsedSchema: computed(() => formSchema)
    }
  }
}

export function withField (el, mapProps, path = '') {
  const Comp = el.component

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
    setup (props, { attrs }) {
      const { validations, modelValue } = toRefs(props)
      const initialValue = modelValue ? modelValue.value : undefined
      // Build a fully qualified field name using dot notation for nested fields
      // ex: user.name
      const name = path ? `${path}.${attrs.model}` : attrs.model
      const { value, errorMessage, meta, setDirty, setTouched, errors } = useField(name, validations, {
        initialValue
      })

      if (modelValue) {
        watch(modelValue, (val) => {
          value.value = val
        })
      }

      return function renderWithField () {
        return h(resolveDynamicComponent(Comp), {
          ...props,
          ...attrs,
          ...mapProps({
            errorMessage: unref(errorMessage),
            errors: unref(errors),
            meta,
            setDirty,
            setTouched
          }, el)
        })
      }
    }
  }
}
