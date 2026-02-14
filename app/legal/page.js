import Link from 'next/link';

export const metadata = {
  title: 'Mentions légales & confidentialité | HotelNetwork',
  description: 'Informations légales, politique de confidentialité et usage des données de HotelNetwork.',
};

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mentions légales</h1>
          <p className="text-sm text-muted-foreground">
            Cette page centralise les informations légales et la politique de confidentialité de HotelNetwork.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Éditeur</h2>
          <p className="text-sm text-muted-foreground">
            HotelNetwork est un service de mise en relation professionnelle entre voyageurs d&apos;affaires.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Données collectées</h2>
          <p className="text-sm text-muted-foreground">
            Nous collectons uniquement les informations nécessaires à l&apos;authentification, à la création de profil,
            à la participation aux événements et à la messagerie.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Base technique</h2>
          <p className="text-sm text-muted-foreground">
            L&apos;application s&apos;appuie sur Firebase Authentication, Firestore et Storage. Les secrets ne sont jamais
            exposés dans le code et sont gérés via les variables d&apos;environnement de la plateforme de déploiement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Pour toute demande relative aux données personnelles, contactez l&apos;équipe produit.
          </p>
        </section>

        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
