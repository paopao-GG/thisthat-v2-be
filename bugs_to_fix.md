BUGS TO FIX:
1. ✅ **FIXED** - OAuth redirect issue: During login, when you didn't sign up your X acc, after signing in to X, it does not continue to the main page, it goes directly to X.
   - **Root Cause**: Backend was using hardcoded production FRONTEND_URL instead of detecting the actual frontend origin
   - **Solution**:
     - Backend now detects localhost from referer header and redirects accordingly
     - Added handling for OAuth user denial (when user cancels sign in on X)
     - Improved error messages in PreLogin page
   - **Files Modified**:
     - `backend/src/features/auth/auth.controllers.ts` - Smart frontend URL detection
     - `frontend/src/app/pages/PreLogin.tsx` - Better error handling for cancelled sign-ins