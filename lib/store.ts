import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// User subscription state
interface SubscriptionState {
  // NGO subscription
  ngoSubscription: {
    plan: "free" | "pro"
    unlocksUsed: number
    expiryDate?: string
  } | null
  
  // Volunteer subscription
  volunteerSubscription: {
    plan: "free" | "pro"
    applicationsUsed: number
    expiryDate?: string
  } | null
  
  // Actions
  setNGOSubscription: (sub: SubscriptionState['ngoSubscription']) => void
  setVolunteerSubscription: (sub: SubscriptionState['volunteerSubscription']) => void
  clearSubscription: () => void
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      ngoSubscription: null,
      volunteerSubscription: null,
      
      setNGOSubscription: (sub) => set({ ngoSubscription: sub }),
      setVolunteerSubscription: (sub) => set({ volunteerSubscription: sub }),
      clearSubscription: () => set({ ngoSubscription: null, volunteerSubscription: null }),
    }),
    {
      name: 'subscription-storage',
    }
  )
)

// User profile state for quick access
interface UserState {
  user: {
    id: string
    name: string
    email: string
    role: "volunteer" | "ngo" | "admin" | null
    image?: string
    isOnboarded: boolean
  } | null
  
  // Unlocked volunteer profiles (for NGOs)
  unlockedProfiles: string[]
  
  // Actions
  setUser: (user: UserState['user']) => void
  addUnlockedProfile: (volunteerId: string) => void
  setUnlockedProfiles: (profiles: string[]) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      unlockedProfiles: [],
      
      setUser: (user) => set({ user }),
      addUnlockedProfile: (volunteerId) => 
        set((state) => ({ 
          unlockedProfiles: [...new Set([...state.unlockedProfiles, volunteerId])] 
        })),
      setUnlockedProfiles: (profiles) => set({ unlockedProfiles: profiles }),
      clearUser: () => set({ user: null, unlockedProfiles: [] }),
    }),
    {
      name: 'user-storage',
    }
  )
)

// Notification state
interface NotificationState {
  unreadCount: number
  hasPermission: boolean
  notifications: Array<{
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
  }>
  
  // Actions
  setUnreadCount: (count: number) => void
  setNotifications: (notifications: NotificationState['notifications']) => void
  addNotification: (notification: NotificationState['notifications'][0]) => void
  markAsRead: (id: string) => void
  setPermission: (hasPermission: boolean) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  hasPermission: false,
  notifications: [],
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  setNotifications: (notifications) => set({ 
    notifications, 
    unreadCount: notifications.filter(n => !n.isRead).length 
  }),
  addNotification: (notification) => 
    set((state) => ({ 
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    })),
  setPermission: (hasPermission) => set({ hasPermission }),
}))

// Message state
interface MessageState {
  unreadCount: number
  conversations: Array<{
    id: string
    participantName: string
    lastMessage: string
    lastMessageAt: string
    unreadCount: number
  }>
  
  // Actions
  setUnreadCount: (count: number) => void
  setConversations: (conversations: MessageState['conversations']) => void
}

export const useMessageStore = create<MessageState>((set) => ({
  unreadCount: 0,
  conversations: [],
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  setConversations: (conversations) => set({ 
    conversations,
    unreadCount: conversations.reduce((acc, c) => acc + c.unreadCount, 0)
  }),
}))

// Platform settings state (public settings from admin)
interface PlatformSettingsState {
  settings: {
    // Platform Info
    platformName: string
    platformDescription: string
    supportEmail: string
    platformLogo?: string
    
    // Payment
    currency: "INR" | "USD" | "EUR" | "GBP" | "SGD" | "AED" | "MYR"
    singleProfileUnlockPrice: number
    
    // Volunteer Plans
    volunteerFreeApplicationsPerMonth: number
    volunteerProPrice: number
    volunteerProFeatures: string[]
    
    // NGO Plans
    ngoFreeProjectsPerMonth: number
    ngoFreeProfileUnlocksPerMonth: number
    ngoProPrice: number
    ngoProFeatures: string[]
    
    // Features
    enablePayments: boolean
    enableMessaging: boolean
    
    // Meta
    metaTitle: string
    metaDescription: string
  } | null
  
  isLoaded: boolean
  
  // Actions
  setSettings: (settings: PlatformSettingsState['settings']) => void
  setLoaded: (loaded: boolean) => void
}

export const usePlatformSettingsStore = create<PlatformSettingsState>()(
  persist(
    (set) => ({
      settings: null,
      isLoaded: false,
      
      setSettings: (settings) => set({ settings, isLoaded: true }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
    }),
    {
      name: 'platform-settings',
    }
  )
)
