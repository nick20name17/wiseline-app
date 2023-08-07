<script setup lang="ts">
import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import { string } from 'yup'

const email = ref('')
const password = ref('')

const onSubmit = (values) => {
  console.log(values)
}

const rules = {
  email: string().required().email().label('Email'),
  password: string().required().label('Password')
}
</script>

<template>
  <section class="flex h-screen">
    <div class="m-auto w-[540px] rounded-[14px] border border-light bg-lighter p-5">
      <h2 class="mb-3.5 text-xl/6 font-bold first-letter:capitalize">Login</h2>
      <Form @submit="onSubmit" v-slot="{ meta }">
        <fieldset class="mb-3.5">
          <Field name="email" :rules="rules.email" v-slot="{ field, errorMessage }">
            <input
              id="email"
              class="w-full appearance-none rounded-xl border p-[18px] text-lg/5 font-semibold placeholder:text-placeholder focus:outline-none"
              :class="[errorMessage ? 'border-danger' : 'border-light-dim']"
              type="email"
              placeholder="E-mail"
              v-bind="field"
              v-model="email"
            />
            <Transition enter-from-class="opacity-0" enter-active-class="transition duration-400">
              <span
                v-show="errorMessage"
                class="inline-block h-auto text-xs text-danger first-letter:capitalize"
              >
                {{ errorMessage }}
              </span>
            </Transition>
          </Field>
        </fieldset>

        <fieldset class="mb-3.5">
          <Field name="password" :rules="rules.password" v-slot="{ field, errorMessage }">
            <input
              class="w-full appearance-none rounded-xl border p-[18px] text-lg/5 font-semibold placeholder:text-placeholder focus:outline-none"
              :class="[errorMessage ? 'border-danger' : 'border-light-dim']"
              id="password"
              type="password"
              placeholder="Password"
              v-bind="field"
              v-model="password"
            />
            <Transition enter-from-class="opacity-0" enter-active-class="transition duration-400">
              <span
                v-show="errorMessage"
                class="inline-block h-auto text-xs text-danger first-letter:capitalize"
              >
                {{ errorMessage }}
              </span>
            </Transition>
          </Field>
        </fieldset>

        <button
          class="w-full rounded-xl border border-primary/10 bg-success p-3.5 font-semibold leading-5 text-white opacity-100 duration-500 ease-in hover:opacity-80 hover:transition-opacity focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          :disabled="!meta.valid"
        >
          Sign In
        </button>
      </Form>
    </div>
  </section>
</template>
