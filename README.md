# HotelNetwork - Application de Rencontres Professionnelles

## Description
HotelNetwork est une application web (PWA-ready) qui permet aux professionnels de se rencontrer lors de leurs séjours hôteliers. Organisez ou rejoignez des événements de networking directement dans votre hôtel.

## Fonctionnalités MVP

### Authentification
- ✅ Connexion via Google OAuth
- ✅ Inscription/Connexion par Email + Mot de passe
- ✅ Gestion des sessions Firebase

### Profil Utilisateur
- ✅ Onboarding complet (photo, entreprise, poste, bio, intérêts)
- ✅ Upload de photo de profil (Firebase Storage)
- ✅ Profil public consultable
- ✅ Modification des paramètres

### Événements
- ✅ Création d'événements avec:
  - Hôtel (nom, adresse, ville)
  - Dates de séjour
  - Date et heure de l'événement
  - Thématique (Apéro, Dîner, Coworking, Petit-déj, Sport, Talk Business)
  - Nombre de places (optionnel)
  - Visibilité (public/privé)
- ✅ Recherche par ville/hôtel
- ✅ Filtres par thématique et période
- ✅ Rejoindre/Quitter un événement
- ✅ Liste des participants
- ✅ Anti-spam: limite de 3 événements/jour

### Messagerie
- ✅ Chat de groupe par événement (temps réel)
- ✅ Chat privé entre utilisateurs (temps réel)
- ✅ Messages avec horodatage
- ✅ Infinite scroll

## Stack Technique

- **Frontend**: Next.js 14 (App Router)
- **Auth**: Firebase Authentication
- **Database**: Firestore
- **Storage**: Firebase Storage
- **UI**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React

## Structure Firestore

### Collections

```
users/
  {uid}/
    - uid: string
    - email: string
    - displayName: string
    - photoURL: string
    - company: string
    - jobTitle: string
    - bio: string
    - city: string
    - linkedinUrl: string
    - interests: string[]
    - onboardingComplete: boolean
    - createdAt: timestamp
    - updatedAt: timestamp

events/
  {eventId}/
    - title: string
    - description: string
    - hotelName: string
    - hotelAddress: string
    - hotelCity: string
    - arrivalDate: timestamp
    - departureDate: timestamp
    - eventDate: timestamp
    - thematique: string
    - maxParticipants: number | null
    - visibility: 'public' | 'private'
    - organizerId: string
    - organizerName: string
    - organizerPhoto: string
    - participantsCount: number
    - createdAt: timestamp
    - updatedAt: timestamp

eventParticipants/
  {participantId}/
    - eventId: string
    - userId: string
    - userName: string
    - userPhoto: string
    - userCompany: string
    - userJobTitle: string
    - joinedAt: timestamp
    - role: 'organizer' | 'participant'

chats/
  {chatId}/
    - type: 'event' | 'private'
    - eventId: string (for event chats)
    - title: string (for event chats)
    - members: string[]
    - membersData: object (for private chats)
    - lastMessage: string
    - lastMessageAt: timestamp
    - lastMessageSender: string
    - createdAt: timestamp

messages/
  {messageId}/
    - chatId: string
    - senderId: string
    - senderName: string
    - senderPhoto: string
    - text: string
    - createdAt: timestamp
```

### Index Recommandés

```
events: eventDate ASC, visibility ASC
events: organizerId ASC, createdAt DESC
eventParticipants: eventId ASC
chats: type ASC, members ASC, lastMessageAt DESC
messages: chatId ASC, createdAt ASC
```

## Configuration Firebase

### 1. Créer un projet Firebase
1. Aller sur https://console.firebase.google.com
2. Créer un nouveau projet
3. Activer Authentication, Firestore, Storage

### 2. Configurer Authentication
1. Activer le provider "Email/Password"
2. Activer le provider "Google"
3. Configurer les domaines autorisés

### 3. Variables d'environnement

Créer un fichier `.env` avec:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Règles de Sécurité Firestore

À déployer dans la console Firebase:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isMember(members) {
      return request.auth.uid in members;
    }
    
    // Users
    match /users/{userId} {
      allow read: if true;  // Profils publics
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && isOwner(userId);
      allow delete: if false;
    }
    
    // Events
    match /events/{eventId} {
      allow read: if resource.data.visibility == 'public' || 
                    (isAuthenticated() && isOwner(resource.data.organizerId));
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && isOwner(resource.data.organizerId);
      allow delete: if isAuthenticated() && isOwner(resource.data.organizerId);
    }
    
    // Event Participants
    match /eventParticipants/{participantId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
      allow delete: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Chats
    match /chats/{chatId} {
      allow read: if isAuthenticated() && isMember(resource.data.members);
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && isMember(resource.data.members);
      allow delete: if false;
    }
    
    // Messages
    match /messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if false;
      allow delete: if false;
    }
  }
}
```

### 5. Règles de Sécurité Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Installation

```bash
# Installer les dépendances
yarn install

# Lancer en développement
yarn dev

# Build pour production
yarn build
yarn start
```

## Déploiement

### Vercel (Frontend)
1. Connecter le repo GitHub à Vercel
2. Ajouter les variables d'environnement Firebase
3. Déployer

### Firebase (Auth, Firestore, Storage)
1. `npm install -g firebase-tools`
2. `firebase login`
3. `firebase init` (sélectionner Firestore et Storage)
4. `firebase deploy --only firestore:rules,storage`

## Structure des Dossiers

```
/app
├── app/
│   ├── layout.js          # Layout principal
│   ├── page.js             # Page d'accueil
│   ├── globals.css         # Styles globaux
│   ├── auth/
│   │   └── page.js         # Login/Register
│   ├── onboarding/
│   │   └── page.js         # Compléter profil
│   ├── events/
│   │   ├── new/
│   │   │   └── page.js     # Créer événement
│   │   └── [id]/
│   │       ├── page.js     # Détail événement
│   │       └── chat/
│   │           └── page.js # Chat événement
│   ├── messages/
│   │   ├── page.js         # Liste conversations
│   │   └── [chatId]/
│   │       └── page.js     # Chat privé
│   ├── profile/
│   │   └── [uid]/
│   │       └── page.js     # Profil utilisateur
│   └── settings/
│       └── page.js         # Paramètres
├── components/
│   └── ui/                 # Composants shadcn
├── contexts/
│   └── AuthContext.js      # Context d'authentification
└── lib/
    └── firebase/
        └── config.js       # Configuration Firebase
```

## Écrans

| Route | Description |
|-------|-------------|
| `/` | Landing + Liste événements |
| `/auth` | Login/Register |
| `/onboarding` | Compléter profil |
| `/events/new` | Créer événement |
| `/events/[id]` | Détail événement |
| `/events/[id]/chat` | Chat groupe |
| `/messages` | Liste conversations |
| `/messages/[chatId]` | Chat privé |
| `/profile/[uid]` | Profil utilisateur |
| `/settings` | Paramètres compte |

## Hypothèses faites

1. **Design**: Palette violet/bleu professionnelle, mobile-first
2. **Thématiques**: 6 types prédéfinis (Apéro, Dîner, Coworking, Petit-déj, Sport, Talk Business)
3. **Anti-spam**: Limite de 3 événements par jour par utilisateur
4. **Notifications**: In-app uniquement pour le MVP
5. **Recherche hôtel**: Texte libre (pas d'intégration Google Places pour simplifier)

## Améliorations MVP+

- [ ] Notifications push
- [ ] Intégration Google Places pour les hôtels
- [ ] Rappels 2h avant l'événement
- [ ] État "typing..." dans le chat
- [ ] Modération des événements
- [ ] Dark mode toggle
- [ ] PWA complète avec service worker
