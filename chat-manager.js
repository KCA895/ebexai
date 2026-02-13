// Chat Manager - Handle multiple chat rooms
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let currentChatId = null;
let allChats = [];
let db = null;
let currentUserId = null;

// Initialize chat manager
export function initChatManager(firestore, userId) {
    db = firestore;
    currentUserId = userId;
}

// Create new chat
export async function createNewChat() {
    if (!db || !currentUserId) return null;

    try {
        const newChat = {
            userId: currentUserId,
            title: 'New Chat',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            pinned: false,
            messageCount: 0,
            lastMessage: ''
        };

        const chatRef = await addDoc(collection(db, 'chats'), newChat);
        currentChatId = chatRef.id;

        // Refresh sidebar
        await loadAllChats();

        // Clear messages and show welcome
        if (window.loadChatMessages) {
            await window.loadChatMessages(chatRef.id);
        }

        // Update chat title
        document.getElementById('chat-title').textContent = 'New Chat';

        return chatRef.id;
    } catch (error) {
        console.error('Error creating chat:', error);
        return null;
    }
}

// Load all user chats
export async function loadAllChats() {
    if (!db || !currentUserId) return;

    try {
        const chatsQuery = query(
            collection(db, 'chats'),
            where('userId', '==', currentUserId)
        );

        const snapshot = await getDocs(chatsQuery);
        allChats = [];

        snapshot.forEach(doc => {
            allChats.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort by updatedAt in JavaScript instead of Firestore
        allChats.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis() || 0;
            const timeB = b.updatedAt?.toMillis() || 0;
            return timeB - timeA; // desc order
        });

        // Set first chat as current if no chat is selected
        if (!currentChatId && allChats.length > 0) {
            currentChatId = allChats[0].id;
        }

        renderChatList();
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

// Render chat list in sidebar
function renderChatList() {
    // Clear all lists
    document.getElementById('chats-pinned').innerHTML = '';
    document.getElementById('chats-today').innerHTML = '';
    document.getElementById('chats-yesterday').innerHTML = '';
    document.getElementById('chats-week').innerHTML = '';
    document.getElementById('chats-older').innerHTML = '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let hasPinned = false;

    allChats.forEach(chat => {
        const chatDate = chat.updatedAt?.toDate() || new Date();
        let group = 'chats-older';

        if (chat.pinned) {
            group = 'chats-pinned';
            hasPinned = true;
        } else if (chatDate >= today) {
            group = 'chats-today';
        } else if (chatDate >= yesterday) {
            group = 'chats-yesterday';
        } else if (chatDate >= weekAgo) {
            group = 'chats-week';
        }

        const chatElement = createChatElement(chat);
        document.getElementById(group).appendChild(chatElement);
    });

    // Show/hide pinned group
    document.getElementById('group-pinned').style.display = hasPinned ? 'block' : 'none';

    // Hide empty groups
    ['today', 'yesterday', 'week', 'older'].forEach(period => {
        const list = document.getElementById(`chats-${period}`);
        const group = document.getElementById(`group-${period}`);
        group.style.display = list.children.length > 0 ? 'block' : 'none';
    });
}

// Create chat element
function createChatElement(chat) {
    const div = document.createElement('div');
    div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''} ${chat.pinned ? 'pinned' : ''}`;
    div.setAttribute('data-chat-id', chat.id);
    div.onclick = () => switchChat(chat.id);

    const icon = chat.pinned ? '📌' : '💬';
    const preview = chat.lastMessage ? chat.lastMessage.substring(0, 50) + '...' : 'No messages yet';

    div.innerHTML = `
        <div class="chat-item-icon">${icon}</div>
        <div class="chat-item-content">
            <div class="chat-item-title">${escapeHtml(chat.title)}</div>
            <div class="chat-item-preview">${escapeHtml(preview)}</div>
        </div>
        <div class="chat-item-actions">
            <button class="chat-action-btn" onclick="event.stopPropagation(); togglePin('${chat.id}')" title="${chat.pinned ? 'Unpin' : 'Pin'}">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3.33337V10M10 3.33337L6.66667 6.66671M10 3.33337L13.3333 6.66671M6.66667 8.33337L5 10L10 15L15 10L13.3333 8.33337M10 15V16.6667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <button class="chat-action-btn" onclick="event.stopPropagation(); deleteChat('${chat.id}')" title="Delete">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M2.5 5H4.16667M4.16667 5H17.5M4.16667 5V16.6667C4.16667 17.1087 4.34226 17.5326 4.65482 17.8452C4.96738 18.1577 5.39131 18.3333 5.83333 18.3333H14.1667C14.6087 18.3333 15.0326 18.1577 15.3452 17.8452C15.6577 17.5326 15.8333 17.1087 15.8333 16.6667V5H4.16667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
    `;

    return div;
}

// Switch to different chat
export async function switchChat(chatId) {
    currentChatId = chatId;

    // Update active state
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Update chat title
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
        document.getElementById('chat-title').textContent = chat.title;
    }

    // Load messages for this chat
    if (window.loadChatMessages) {
        await window.loadChatMessages(chatId);
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        document.getElementById('chat-sidebar').classList.add('collapsed');
    }
}

// Toggle pin chat
window.togglePin = async function(chatId) {
    if (!db) return;

    try {
        const chat = allChats.find(c => c.id === chatId);
        if (!chat) return;

        await updateDoc(doc(db, 'chats', chatId), {
            pinned: !chat.pinned,
            updatedAt: serverTimestamp()
        });

        await loadAllChats();
    } catch (error) {
        console.error('Error toggling pin:', error);
    }
};

// Delete chat
window.deleteChat = async function(chatId) {
    if (!db) return;
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        console.log('Deleting chat:', chatId);

        // Delete all messages in this chat (subcollection)
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);

        console.log('Deleting', messagesSnapshot.size, 'messages');

        const deletePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref));
        await Promise.all(deletePromises);

        // Delete the chat document
        await deleteDoc(doc(db, 'chats', chatId));

        console.log('Chat deleted successfully');

        // If this was current chat, switch to first available or create new
        if (chatId === currentChatId) {
            currentChatId = null;
            await loadAllChats();

            if (allChats.length > 0) {
                await switchChat(allChats[0].id);
            } else {
                await createNewChat();
            }
        } else {
            await loadAllChats();
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete chat: ' + error.message);
    }
};

// Rename current chat
export async function renameCurrentChat() {
    if (!currentChatId || !db) {
        alert('Please select a chat first');
        return;
    }

    const chat = allChats.find(c => c.id === currentChatId);

    if (!chat) {
        alert('Chat not found. Please refresh the page.');
        return;
    }

    const newTitle = prompt('Enter new chat name:', chat.title);
    if (!newTitle || newTitle === chat.title) {
        return;
    }

    try {
        await updateDoc(doc(db, 'chats', currentChatId), {
            title: newTitle,
            updatedAt: serverTimestamp()
        });

        document.getElementById('chat-title').textContent = newTitle;
        await loadAllChats();
    } catch (error) {
        console.error('Error renaming chat:', error);
        alert('Failed to rename chat: ' + error.message);
    }
}

// Update chat last message
export async function updateChatLastMessage(chatId, message) {
    if (!db) return;

    try {
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: message.substring(0, 100),
            updatedAt: serverTimestamp(),
            messageCount: (allChats.find(c => c.id === chatId)?.messageCount || 0) + 1
        });

        await loadAllChats();
    } catch (error) {
        console.error('Error updating chat:', error);
    }
}

// Search chats (search in title, lastMessage, and messages content)
window.searchChats = async function(searchTerm) {
    const term = searchTerm.toLowerCase().trim();

    if (term === '') {
        // Restore all chats
        renderChatList();
        return;
    }

    // Show loading state
    document.getElementById('chats-today').innerHTML = '<div style="padding: 12px; color: #9ca3af; font-size: 14px;">Searching...</div>';
    document.getElementById('group-today').style.display = 'block';

    try {
        // Filter chats by title and lastMessage first (fast)
        let filteredChats = allChats.filter(chat => {
            const titleMatch = chat.title?.toLowerCase().includes(term);
            const previewMatch = chat.lastMessage?.toLowerCase().includes(term);
            return titleMatch || previewMatch;
        });

        // If no results from basic search, search in message content (slower but thorough)
        if (filteredChats.length === 0 && db && currentUserId) {
            const chatsWithMatches = [];

            for (const chat of allChats) {
                // Search in messages of this chat
                const messagesRef = collection(db, 'chats', chat.id, 'messages');
                const messagesSnapshot = await getDocs(messagesRef);

                let hasMatch = false;
                messagesSnapshot.forEach(msgDoc => {
                    const msgData = msgDoc.data();
                    if (msgData.message?.toLowerCase().includes(term)) {
                        hasMatch = true;
                    }
                });

                if (hasMatch) {
                    chatsWithMatches.push(chat);
                }
            }

            filteredChats = chatsWithMatches;
        }

        // Clear all lists
        document.getElementById('chats-pinned').innerHTML = '';
        document.getElementById('chats-today').innerHTML = '';
        document.getElementById('chats-yesterday').innerHTML = '';
        document.getElementById('chats-week').innerHTML = '';
        document.getElementById('chats-older').innerHTML = '';

        // Render filtered results
        if (filteredChats.length === 0) {
            document.getElementById('chats-today').innerHTML = '<div style="padding: 12px; color: #9ca3af; font-size: 14px;">No chats found</div>';
            document.getElementById('group-today').style.display = 'block';
            return;
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        let hasPinned = false;

        filteredChats.forEach(chat => {
            const chatDate = chat.updatedAt?.toDate() || new Date();
            let group = 'chats-older';

            if (chat.pinned) {
                group = 'chats-pinned';
                hasPinned = true;
            } else if (chatDate >= today) {
                group = 'chats-today';
            } else if (chatDate >= yesterday) {
                group = 'chats-yesterday';
            } else if (chatDate >= weekAgo) {
                group = 'chats-week';
            }

            const chatElement = createChatElement(chat);
            document.getElementById(group).appendChild(chatElement);
        });

        // Show/hide groups
        document.getElementById('group-pinned').style.display = hasPinned ? 'block' : 'none';
        ['today', 'yesterday', 'week', 'older'].forEach(period => {
            const list = document.getElementById(`chats-${period}`);
            const group = document.getElementById(`group-${period}`);
            group.style.display = list.children.length > 0 ? 'block' : 'none';
        });
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('chats-today').innerHTML = '<div style="padding: 12px; color: #ef4444; font-size: 14px;">Error searching chats</div>';
    }
};

// Toggle sidebar
window.toggleSidebar = function() {
    const sidebar = document.getElementById('chat-sidebar');
    sidebar.classList.toggle('collapsed');
};

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get current chat ID
export function getCurrentChatId() {
    return currentChatId;
}

// Set current chat ID
export function setCurrentChatId(chatId) {
    currentChatId = chatId;
}

// Export functions to window for onclick handlers
// Note: createNewChat is overridden in app.js
// window.renameCurrentChat and window.deleteCurrentChat are used in HTML
