# Testing Guide - EbexAI

## Server Setup
Server sudah running di: **http://localhost:3000**

## Testing Steps

### 1. Basic Login & Chat
1. Buka browser: http://localhost:3000
2. Login dengan salah satu method (Email/Google/Anonymous)
3. Pastikan muncul welcome message dengan avatar EBEX AI
4. Ketik message "test" dan send
5. Pastikan AI respond dengan personality pemalas
6. Check console untuk logs: "Saving message to chat: [chatId]"

### 2. Test New Chat
1. Click button "New Chat" (tombol dengan icon +)
2. Pastikan muncul chat baru dengan title "New Chat"
3. Pastikan sidebar update dengan chat baru
4. Send message di chat baru
5. Check apakah tersimpan di chat yang benar

### 3. Test Search
1. Pastikan ada beberapa chat dengan title berbeda
2. Ketik di search box (misalnya: "test")
3. Pastikan hanya chat yang match yang muncul
4. Clear search (hapus text) → semua chat muncul lagi
5. Check console: tidak ada error

### 4. Test Rename Chat
1. Click button rename (icon pensil) di header
2. Ketik nama baru di prompt
3. Click OK
4. Pastikan:
   - Title di header berubah
   - Title di sidebar berubah
   - Tidak ada error di console

### 5. Test Delete Chat
1. Hover chat di sidebar
2. Click button delete (icon trash)
3. Confirm delete
4. Pastikan:
   - Chat hilang dari sidebar
   - Auto switch ke chat lain (atau create new chat jika ini chat terakhir)
   - Console log: "Deleting chat: [chatId]" → "Chat deleted successfully"
   - Tidak ada error

### 6. Test Pin Chat
1. Hover chat di sidebar
2. Click button pin
3. Pastikan chat pindah ke section "Pinned" di atas
4. Click pin lagi untuk unpin
5. Pastikan kembali ke section waktu aslinya

### 7. Test Admin Dashboard
1. Buka: http://localhost:3000/dashboard.html
2. Login dengan email admin: kelvinchristianangelo@gmail.com
3. Pastikan:
   - Stats cards show correct numbers
   - User cards muncul dengan data lengkap
   - Chat rooms dan messages tampil
   - Tidak ada error "Missing or insufficient permissions"

## Common Issues & Solutions

### Issue: "No chat ID found, cannot save message"
**Solution:**
- Check console log saat login
- Pastikan `loadAllChats()` dipanggil
- Pastikan ada chat yang ter-select

### Issue: "Missing or insufficient permissions"
**Solution:**
- Deploy Firestore rules dari file `firestore.rules`
- Steps ada di file `FIRESTORE_SETUP.md`

### Issue: Delete tidak bekerja
**Solution:**
- Check console logs
- Pastikan error message muncul
- Check apakah messages subcollection terhapus
- Verify Firestore rules allow delete

### Issue: Rename tidak muncul prompt
**Solution:**
- Check console: "window.renameCurrentChat is not a function"
- Verify export di app.js
- Reload page dengan hard refresh (Cmd+Shift+R)

### Issue: Search tidak filter
**Solution:**
- Check apakah `allChats` array ada data
- Console log: `console.log(allChats)` di browser console
- Pastikan chat punya `title` dan `lastMessage`

## Debug Commands (Browser Console)

```javascript
// Check current chat ID
getCurrentChatId()

// Check all loaded chats
console.log(allChats)

// Force reload chats
loadAllChats()

// Check if functions exist
console.log(typeof window.createNewChat)
console.log(typeof window.renameCurrentChat)
console.log(typeof window.deleteChat)
console.log(typeof window.searchChats)
```

## Expected Console Logs

**On Login:**
```
Saving message to chat: [chatId]
Message saved successfully
```

**On Delete:**
```
Deleting chat: [chatId]
Deleting X messages
Chat deleted successfully
```

**On Search:**
- No errors
- Filtered results show in sidebar

## Server Running
- Port: 3000
- URL: http://localhost:3000
- Stop: `pkill -f "python3 -m http.server 3000"`
