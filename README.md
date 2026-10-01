# Trend Delivery

نسخة أولية كاملة لتطبيق Trend Delivery، مجهزة كبداية للنشر على Koyeb.

## الموجود في النسخة
- Users + Roles/Permissions
- Orders
- Dispatcher/Employee workflow
- Driver role
- Driver location API
- Internal chat + chat linked to orders
- WhatsApp customer location request
- Supabase schema
- R2 environment placeholders
- Koyeb-friendly Node.js start command

## التشغيل
```bash
npm install
npm start
```

ثم افتح:
`http://localhost:3000`

## GitHub / Koyeb
ارفع الملفات الموجودة داخل هذا المجلد إلى repository:
`-trend-delivery`

ولا ترفع `.env`. استخدم Environment Variables في Koyeb.

## Supabase
1. أنشئ مشروع Supabase.
2. نفّذ `schema.sql` في SQL Editor.
3. ضع `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` في Koyeb لاحقاً.

> النسخة الحالية تعمل ببيانات تجريبية داخل الذاكرة حتى يمكن اختبار الواجهة والنشر أولاً. عند ربط Supabase يتم نقل البيانات الدائمة إليه.

## Cloudflare R2
متغيرات R2 موجودة في `.env.example` لتجهيز رفع الصور/المستندات لاحقاً.

## مهم
لا تضع مفاتيح Supabase أو R2 الحقيقية داخل GitHub.
