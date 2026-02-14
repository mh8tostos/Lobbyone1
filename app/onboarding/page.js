'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Camera,
  Building2,
  Briefcase,
  MapPin,
  Linkedin,
  Loader2,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';

const INTERESTS = [
  'Tech & Innovation',
  'Marketing',
  'Finance',
  'Startup',
  'Ressources Humaines',
  'Commercial',
  'Conseil',
  'Immobilier',
  'Santé',
  'Énergie',
  'E-commerce',
  'Industrie',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, userProfile, refreshUserProfile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [photoURL, setPhotoURL] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
    if (userProfile) {
      setPhotoURL(userProfile.photoURL || user?.photoURL || '');
      setCompany(userProfile.company || '');
      setJobTitle(userProfile.jobTitle || '');
      setBio(userProfile.bio || '');
      setCity(userProfile.city || '');
      setLinkedinUrl(userProfile.linkedinUrl || '');
      setSelectedInterests(userProfile.interests || []);
    }
  }, [authLoading, user, userProfile, router]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      toast.success('Photo uploadée !');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload");
    }
    setUploading(false);
  };

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
        ? [...prev, interest]
        : prev
    );
  };

  const handleSubmit = async () => {
    if (!company || !jobTitle) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL,
        company,
        jobTitle,
        bio,
        city,
        linkedinUrl,
        interests: selectedInterests,
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
      });
      await refreshUserProfile();
      toast.success('Profil complété !');
      router.push('/');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Erreur lors de la mise à jour');
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                s <= step ? 'bg-primary' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Photo */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Votre photo de profil</CardTitle>
              <CardDescription>
                Une photo professionnelle augmente vos chances de rencontres
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative mb-6">
                <Avatar className="w-32 h-32 border-4 border-primary/20">
                  <AvatarImage src={photoURL} />
                  <AvatarFallback className="text-3xl">
                    {user?.displayName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </div>

              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Passer
                </Button>
                <Button className="flex-1" onClick={() => setStep(2)}>
                  Continuer
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Professional Info */}
        {step === 2 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Informations professionnelles</CardTitle>
              <CardDescription>Présentez-vous aux autres professionnels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">
                  Entreprise <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="company"
                    placeholder="Nom de votre entreprise"
                    className="pl-10"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">
                  Poste <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="jobTitle"
                    placeholder="Votre fonction"
                    className="pl-10"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Votre ville"
                    className="pl-10"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (optionnel)</Label>
                <Textarea
                  id="bio"
                  placeholder="Présentez-vous en quelques mots..."
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn (optionnel)</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/..."
                    className="pl-10"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!company || !jobTitle}
                >
                  Continuer
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Centres d'intérêt pro</CardTitle>
              <CardDescription>Sélectionnez jusqu'à 5 domaines (optionnel)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                {INTERESTS.map((interest) => (
                  <Badge
                    key={interest}
                    variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                    className="cursor-pointer py-2 px-3"
                    onClick={() => toggleInterest(interest)}
                  >
                    {selectedInterests.includes(interest) && (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    {interest}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {selectedInterests.length}/5 sélectionnés
              </p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Terminer
                  <Check className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
