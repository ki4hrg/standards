import type { FormEvent } from "react";

// React 19 resets a `<form action={fn}>` once the action returns, so a form that
// stays on screen after the server refused the input loses what was typed
// (design.md: forms keep what was typed). React resets through the native
// `form.reset()`, whose cancelable "reset" event this cancels; `useFormStatus`
// keeps working.
//
//   <form action={fn} onReset={keepFormValues}>
//
// It cancels every reset, so the form also keeps its values after a success. A
// form that should clear after a success cancels only when the action refused.
export function keepFormValues(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
}
