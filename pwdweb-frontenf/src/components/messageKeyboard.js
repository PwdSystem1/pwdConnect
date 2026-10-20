// Desktop keyboard shortcut; mobile keeps the native newline and Send button.
export function handleMessageEnter(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey ||
      event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.nativeEvent?.keyCode === 229) return;
  const input = event.currentTarget;
  const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches;
  if (!desktop || input.disabled) return;
  event.preventDefault();
  if (event.repeat) return;
  const form = input.form;
  const submit = form?.querySelector('button[type="submit"]');
  if (!submit || submit.disabled) return;
  form.requestSubmit(submit);
}
