# Steps to Run Main Branch with JTBD Features

## Summary
All code from PR #11 has been successfully merged to main. The database already has `t_jtbd_executions` table (since both branches use same DB). You just need to restart your services.

## Steps to See "Jobs to Do" Working

### Step 1: Stop All Running Services
```bash
# Stop backend if running
# Press Ctrl+C in the terminal running the backend

# Stop frontend if running
# Press Ctrl+C in the terminal running the frontend
```

### Step 2: Start Backend (Terminal 1)
```bash
cd /home/user/kewalinvest/backend
npm run dev
```

**Wait for this message:**
```
✅ Server running on port 8080
✅ Connected to database
```

### Step 3: Start Frontend (Terminal 2)
```bash
cd /home/user/kewalinvest/frontend
npm start
```

**Wait for this message:**
```
webpack compiled successfully
Local: http://localhost:3000
```

### Step 4: Open Browser
```
http://localhost:3000
```

## What You Should See

1. ✅ **"Jobs to Do"** tab (instead of "Meetings")
2. ✅ All your existing JTD executions from the database
3. ✅ Ability to create meetings via JTBD system
4. ✅ SIP executions for goals with monthly_contribution

## If Still Not Working

### Check Backend Logs
Look for these lines when backend starts:
```
app.use('/api/jtbd-v2', jtbdUnifiedRoutes); // NEW: Unified JTBD
```

### Check Frontend Console (Browser DevTools)
```javascript
// Should see:
🔗 API Base URL: http://localhost:8080
```

### Verify API Endpoint
Open browser: `http://localhost:8080/api/jtbd-v2/execution?customer_id=1`

Should return JSON with executions list.

## Troubleshooting

### Backend Won't Start
```bash
cd /home/user/kewalinvest/backend
npm install  # Reinstall dependencies
npm run dev
```

### Frontend Build Issues
```bash
cd /home/user/kewalinvest/frontend
rm -rf node_modules/.cache
npm start
```

### Database Connection Issues
Check that PostgreSQL is running:
```bash
docker compose ps postgres
# Should show "running"
```

## Key Files Merged to Main

✅ Backend:
- `backend/src/services/jtbd.execution.service.ts`
- `backend/src/controllers/jtbd.unified.controller.ts`
- `backend/src/routes/jtbd.unified.routes.ts`
- `backend/db/migrations/008_jtbd_consolidation.sql`

✅ Frontend:
- `frontend/src/hooks/useJTBD.ts` (with execution hooks)
- `frontend/src/services/jtbd.service.ts` (with execution methods)
- `frontend/src/types/jtbd.types.ts` (with JTBDExecution types)
- `frontend/src/components/jtbd/JTBDExecutionTimeline.tsx`
- `frontend/src/pages/customers/CustomerViewPage.tsx` (line 635: "Jobs to Do")

## Need Help?

If you still see "Meetings" instead of "Jobs to Do" after restarting:
1. Clear browser cache (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify backend is running on port 8080
4. Check if frontend is calling correct API: `http://localhost:8080/api/jtbd-v2/execution`
