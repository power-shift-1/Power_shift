/** What a form's Server Action answers with. */
export type FormState = { ok?: boolean; message?: string };

export const ok = (message: string): FormState => ({ ok: true, message });
export const fail = (message: string): FormState => ({ ok: false, message });
