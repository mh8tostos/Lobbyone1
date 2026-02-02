'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import HotelAutocomplete from '@/components/HotelAutocomplete';
import {
  ArrowLeft,
  Hotel,
  MapPin,
  Calendar,
  Clock,
  Users,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';

const THEMATIQUES = [
  { id: 'apero', label: 'Apéro' },
  { id: 'diner', label: 'Dîner' },
  { id: 'coworking', label: 'Coworking' },
  { id: 'petit-dej', label: 'Petit-déjeuner' },
  { id: 'sport', label: 'Sport' },
  { id: 'talk-business', label: 'Talk Business' },
];

export default function NewEventPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelCity, setHotelCity] = useState('');
  const [hotelPlaceId, setHotelPlaceId] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [thematique, setThematique] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [visibility, setVisibility] = useState('public');

  // Handle hotel selection from autocomplete
  const handleHotelSelect = (hotel) => {
    if (hotel) {
      setHotelName(hotel.name);
      setHotelAddress(hotel.address);
      setHotelCity(hotel.city);
      setHotelPlaceId(hotel.placeId);
    } else {
      setHotelName('');
      setHotelAddress('');
      setHotelCity('');
      setHotelPlaceId('');
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  const validateForm = () => {
    if (!title.trim()) {
      toast.error('Le titre est requis');
      return false;
    }
    if (!hotelName.trim()) {
      toast.error("Le nom de l'hôtel est requis");
      return false;
    }
    if (!hotelCity.trim()) {
      toast.error('La ville est requise');
      return false;
    }
    if (!eventDate) {
      toast.error("La date de l'événement est requise");
      return false;
    }
    if (!eventTime) {
      toast.error("L'heure de l'événement est requise");
      return false;
    }
    if (!thematique) {
      toast.error('La thématique est requise');
      return false;
    }

    // Validate dates
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    if (eventDateTime <= new Date()) {
      toast.error("L'événement doit être dans le futur");
      return false;
    }

    if (arrivalDate && departureDate) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(departureDate);
      if (departure <= arrival) {
        toast.error('La date de départ doit être après la date d\'arrivée');
        return false;
      }
      if (eventDateTime < arrival || eventDateTime > departure) {
        toast.error("L'événement doit être pendant votre séjour");
        return false;
      }
    }

    return true;
  };

  const checkEventLimit = async () => {
    // Anti-spam: max 3 events per day per user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid),
      where('createdAt', '>=', Timestamp.fromDate(today)),
      where('createdAt', '<', Timestamp.fromDate(tomorrow))
    );

    const snapshot = await getDocs(q);
    return snapshot.size < 3;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Check event limit
      const canCreate = await checkEventLimit();
      if (!canCreate) {
        toast.error('Vous avez atteint la limite de 3 événements par jour');
        setLoading(false);
        return;
      }

      const eventDateTime = new Date(`${eventDate}T${eventTime}`);

      // Create event
      const eventRef = await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        hotelName: hotelName.trim(),
        hotelAddress: hotelAddress.trim(),
        hotelCity: hotelCity.trim(),
        hotelPlaceId: hotelPlaceId || null,
        arrivalDate: arrivalDate ? Timestamp.fromDate(new Date(arrivalDate)) : null,
        departureDate: departureDate ? Timestamp.fromDate(new Date(departureDate)) : null,
        eventDate: Timestamp.fromDate(eventDateTime),
        thematique,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        visibility,
        organizerId: user.uid,
        organizerName: userProfile?.displayName || user.displayName,
        organizerPhoto: userProfile?.photoURL || user.photoURL,
        participantsCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add organizer as first participant
      await addDoc(collection(db, 'eventParticipants'), {
        eventId: eventRef.id,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName,
        userPhoto: userProfile?.photoURL || user.photoURL,
        userCompany: userProfile?.company || '',
        userJobTitle: userProfile?.jobTitle || '',
        joinedAt: serverTimestamp(),
        role: 'organizer',
      });

      // Create event chat
      await addDoc(collection(db, 'chats'), {
        type: 'event',
        eventId: eventRef.id,
        title: title.trim(),
        members: [user.uid],
        lastMessage: null,
        lastMessageAt: null,
        createdAt: serverTimestamp(),
      });

      toast.success('Événement créé avec succès !');
      router.push(`/events/${eventRef.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error("Erreur lors de la création de l'événement");
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Créer un événement</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Titre de l'événement <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Ex: Apéro networking tech"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre événement..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thematique">
                  Thématique <span className="text-destructive">*</span>
                </Label>
                <Select value={thematique} onValueChange={setThematique}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une thématique" />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMATIQUES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Hotel Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hotel className="w-5 h-5" />
                Hôtel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Rechercher un hôtel <span className="text-destructive">*</span>
                </Label>
                <HotelAutocomplete
                  value={hotelName}
                  onChange={(value) => setHotelName(value)}
                  onSelect={handleHotelSelect}
                  placeholder="Rechercher un hôtel..."
                />
                <p className="text-xs text-muted-foreground">
                  Commencez à taper pour voir les suggestions Google Places
                </p>
              </div>

              {hotelAddress && (
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm">{hotelAddress}</p>
                      {hotelCity && (
                        <p className="text-sm text-muted-foreground">{hotelCity}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!hotelAddress && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="hotelAddressManual">Adresse (optionnel)</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="hotelAddressManual"
                        placeholder="123 rue Example"
                        className="pl-10"
                        value={hotelAddress}
                        onChange={(e) => setHotelAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hotelCityManual">
                      Ville <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="hotelCityManual"
                      placeholder="Paris"
                      value={hotelCity}
                      onChange={(e) => setHotelCity(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arrivalDate">Date d'arrivée</Label>
                  <Input
                    id="arrivalDate"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departureDate">Date de départ</Label>
                  <Input
                    id="departureDate"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Date/Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date et heure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventTime">
                    Heure <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="eventTime"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Nombre de places (optionnel)</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="maxParticipants"
                    type="number"
                    placeholder="Illimité"
                    className="pl-10"
                    min="2"
                    max="100"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Visibilité</Label>
                <RadioGroup value={visibility} onValueChange={setVisibility}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                      <Eye className="w-4 h-4" />
                      Public - visible par tous
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                      <EyeOff className="w-4 h-4" />
                      Privé - sur invitation uniquement
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg text-sm">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-800">
              Vous êtes limité à 3 événements par jour. Un chat de groupe sera
              automatiquement créé pour les participants.
            </p>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Créer l'événement
          </Button>
        </form>
      </main>
    </div>
  );
}
