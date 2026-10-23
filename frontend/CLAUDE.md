Every backend call goes through `src/lib/api.ts`, which attaches the Supabase access token when signed in. `src/types.ts` mirrors the Pydantic models in `backend/scm/models.py`, so keep the two in sync. `src/lib/session.tsx` provides sign-in/role state. Without `.env.local`, the app runs in demo mode with a view-as picker. The UI hides actions the API would refuse for the caller's role.

`npm run lint` is only `tsc --noEmit`; there is no ESLint.
