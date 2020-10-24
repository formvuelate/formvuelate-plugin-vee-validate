import veeValidatePlugin from '../../src/index.js'
import { SchemaFormFactory } from 'formvuelate'
import { mount } from '@vue/test-utils'
import { markRaw, ref } from 'vue'
import * as yup from 'yup';
import flushPromises from 'flush-promises';

const FormText = {
  template: `
    <div>
      <input @input="$emit('update:modelValue', $event.target.value)" />
      <span>{{ errorMessage }}</span>
    </div>
  `,
  emits: ['update:modelValue'],
  props: ['label', 'modelValue', 'errorMessage']
}

markRaw(FormText)

const REQUIRED_MESSAGE = 'This field is required'
const MIN_MESSAGE = 'Too short'
const EMAIL_MESSAGE = 'Invalid Email'

describe('FVL integration', () => {
  it('renders error messages using errorMessage prop', async () => {
    const schema = [
      {
        type: 'BaseInput',
        label: 'First Name',
        model: 'firstName',
        component: FormText,
        validations: yup.string().required(REQUIRED_MESSAGE),
      },
    ]

    const SchemaWithValidation = SchemaFormFactory([
      veeValidatePlugin
    ])

    const wrapper = mount({
      template: `
        <SchemaWithValidation :schema="schema" v-model="formData" />
      `,
      components: {
        SchemaWithValidation
      },
      setup() {
        const formData = ref({});
        return {
          schema,
          formData
        }
      }
    });

    const input = wrapper.findComponent(FormText)
    input.setValue('')
    await flushPromises()
    expect(wrapper.find('span').text()).toBe(REQUIRED_MESSAGE)
    input.setValue('hello')
    await flushPromises()
    expect(wrapper.find('span').text()).toBe('')
  })

  it('does form-level validation with validation-schema attr', async () => {
    const schema = [
      {
        type: 'BaseInput',
        label: 'Email',
        model: 'email',
        component: FormText,
      },
      {
        type: 'BaseInput',
        label: 'Password',
        model: 'password',
        component: FormText,
      },
    ]

    const SchemaWithValidation = SchemaFormFactory([
      veeValidatePlugin
    ])

    const wrapper = mount({
      template: `
        <SchemaWithValidation :schema="schema" v-model="formData" :validation-schema="validationSchema" />
      `,
      components: {
        SchemaWithValidation
      },
      setup() {
        const formData = ref({});
        const validationSchema = yup.object().shape({
          email: yup.string().email(EMAIL_MESSAGE).required(),
          password: yup.string().min(4, MIN_MESSAGE).required(),
        });

        return {
          schema,
          formData,
          validationSchema
        }
      }
    });

    const inputs = wrapper.findAllComponents(FormText)
    const errors = wrapper.findAll('span')
    inputs[0].setValue('not email')
    await flushPromises()
    expect(errors[0].text()).toBe(EMAIL_MESSAGE)

    inputs[1].setValue('12')
    await flushPromises()
    expect(errors[1].text()).toBe(MIN_MESSAGE)

    inputs[0].setValue('test@gmail.com')
    await flushPromises()
    expect(errors[0].text()).toBe('')

    inputs[1].setValue('1234')
    await flushPromises()
    expect(errors[1].text()).toBe('')
  })

  it('validates before submission', async () => {
    const schema = [
      {
        type: 'BaseInput',
        label: 'Email',
        model: 'email',
        component: FormText,
      },
      {
        type: 'BaseInput',
        label: 'Password',
        model: 'password',
        component: FormText,
      },
    ]

    const SchemaWithValidation = SchemaFormFactory([
      veeValidatePlugin
    ])

    const onSubmit = jest.fn();

    const wrapper = mount({
      template: `
        <SchemaWithValidation :schema="schema" v-model="formData" :validation-schema="validationSchema" @submit.prevent="onSubmit" />
      `,
      components: {
        SchemaWithValidation
      },
      setup() {
        const formData = ref({});
        const validationSchema = yup.object().shape({
          email: yup.string().email(EMAIL_MESSAGE).required(),
          password: yup.string().min(4, MIN_MESSAGE).required(),
        });

        return {
          schema,
          formData,
          validationSchema,
          onSubmit,
        }
      }
    });

    const inputs = wrapper.findAllComponents(FormText)
    const form = wrapper.find('form')

    form.trigger('submit');
    await flushPromises()
    expect(onSubmit).toHaveBeenCalledTimes(0);

    inputs[0].setValue('test@gmail.com')
    await flushPromises()

    inputs[1].setValue('1234')
    await flushPromises()

    form.trigger('submit')
    await flushPromises()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
