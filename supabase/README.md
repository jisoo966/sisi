# Sísí — Supabase Setup

## 🚀 Quick Start

### 1. Supabase 프로젝트 생성
1. https://supabase.com/dashboard 로 가서 새 프로젝트 만들기
2. `Project Settings > API` 에서 URL + Anon Key + Service Role Key 복사
3. `.env.local` 에 붙여넣기:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### 2. Schema 실행
1. Supabase Dashboard → **SQL Editor**
2. `migrations/001_initial_schema.sql` 파일 열어서 **전체 복사**
3. SQL Editor에 붙여넣기 → **Run** (녹색 버튼)
4. 성공하면 `Tables` 탭에서 확인:
   - `profiles`
   - `stars`
   - `signs`
   - `postcards`
   - `chat_sessions`
   - `chat_messages`
   - `angel_messages`

### 3. Storage bucket (postcards)
1. Supabase Dashboard → **Storage** → **New Bucket**
2. Name: `postcards`
3. Public: **NO**
4. File size limit: `500 KB`
5. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
6. 그 후 SQL Editor에서 아래 3개 policy 실행:

```sql
CREATE POLICY "Users can upload own postcards"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'postcards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own postcards"
ON storage.objects FOR SELECT
USING (bucket_id = 'postcards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own postcards"
ON storage.objects FOR DELETE
USING (bucket_id = 'postcards' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. Auth 설정
1. Supabase Dashboard → **Authentication** → **Providers**
2. **Email** enable → Magic Link only (password는 disable)
3. **URL Configuration**:
   - Site URL: `http://localhost:3000` (개발) / `https://hellosisi.co` (프로덕션)
   - Redirect URLs 에 위 둘 다 추가

### 5. 테스트
```bash
npm run dev
```
`localhost:3000/login` 에서 자기 이메일로 magic link 받아서 로그인 → dashboard 확인.

---

## 📊 Data Model

### 관계도
```
auth.users
   ↓ 1:1
profiles

auth.users
   ↓ 1:N
stars ← 별 (소원)
   ↓ 1:N
signs ← 별에 대한 성찰/발자국

auth.users
   ↓ 1:N
postcards ← 캡쳐한 순간

auth.users
   ↓ 1:N
chat_sessions
   ↓ 1:N
chat_messages ← Sísí와 대화
   ↓ optional link
postcards or signs (저장됐을 때)

auth.users
   ↓ 1:N
angel_messages ← Sísí가 보낸 push 알림
```

### Row Level Security (RLS)
모든 테이블에 RLS 적용됨 — **사용자는 자기 데이터만 볼 수 있음**.
- Client-side (browser)는 anon key 사용 → RLS로 자동 필터
- Server-side (API routes)는 service role key 필요 (필터 우회 가능, 조심)

---

## 🔄 Migration from localStorage

이 스키마 실행 후, 앱 사용자들의 localStorage 데이터는 **자동 이전 안 됨**.

내부 테스트에서는:
1. 새 계정으로 다시 만들거나
2. 아니면 lib/migrations.ts 만들어서 localStorage → Supabase 마이그레이션 로직 (선택)

프로덕션 이전엔 사용자 없으니 그냥 새로 시작 OK.

---

## 🛠️ 개발 팁

### 로컬에서 Supabase 없이 개발
`.env.local` 에 placeholder 두면 supabase 호출 실패 → app fallback으로 localStorage 사용하게 하려면 각 lib에서 `try/catch` 처리 필요. 지금은 로컬 개발 시 실제 Supabase 프로젝트 하나 연결 권장.

### Types 자동 생성
```bash
npx supabase gen types typescript --project-id YOUR_ID > lib/database.types.ts
```

---

## 🚨 Production Checklist

- [ ] 프로덕션 Supabase 프로젝트 별도 생성 (개발과 분리)
- [ ] Auth Site URL을 `https://hellosisi.co` 로 변경
- [ ] Vercel env variables에 프로덕션 키 입력
- [ ] SMTP 설정 (magic link 이메일 발송 — Supabase 기본 이메일은 domain 신뢰도 낮음)
   - Resend 연동 권장
- [ ] Storage bucket size limit 확인
- [ ] Rate limiting 확인 (Supabase 기본 있지만 abuse 대비 추가 가능)
