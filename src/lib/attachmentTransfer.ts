// Resolve ambiguous network responses without overwriting an existing object.
export async function transferReservedAttachment({ resume, finish, upload }: {
  resume: boolean; finish: () => Promise<void>; upload: () => Promise<void>;
}): Promise<void> {
  if (resume) {
    try { await finish(); return; }
    catch (error) {
      if (!error || typeof error !== 'object' || !('message' in error) || error.message !== 'attachment_not_uploaded') throw error;
    }
  }
  try { await upload(); }
  catch (uploadError) {
    try { await finish(); return; }
    catch { throw uploadError; }
  }
  await finish();
}
