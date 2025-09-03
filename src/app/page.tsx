import Link from 'next/link'
import { Shield, Search, Lock, Check } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Proteggi la tua
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
              {" "}privacy digitale
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Scopri se le tue foto sono state pubblicate online senza il tuo consenso. 
            FindMyPic scansiona il web per proteggere la tua immagine e privacy.
          </p>
          <Link href="/search" className="inline-flex items-center bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors">
            <Search className="mr-2 h-5 w-5" />
            Verifica Gratis
          </Link>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Search className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ricerca Avanzata</h3>
            <p className="text-gray-600">
              Scansiona migliaia di siti web e piattaforme per trovare le tue immagini
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Lock className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy Assoluta</h3>
            <p className="text-gray-600">
              Le tue immagini sono crittografate e mai condivise con terze parti
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Protezione Continua</h3>
            <p className="text-gray-600">
              Monitoraggio 24/7 per nuove violazioni della tua privacy
            </p>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Scegli il piano perfetto per te
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gratis</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">€0</div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">1 ricerca gratuita</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">Scansione base</span>
                </li>
              </ul>
              <Link href="/register" className="w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-lg text-center block hover:bg-gray-200 transition-colors">
                Inizia Gratis
              </Link>
            </div>

            {/* Basic Plan */}
            <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-purple-600 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">Popolare</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Basic</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                €9.99<span className="text-lg text-gray-600">/mese</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">10 ricerche al mese</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">Scansione avanzata</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">Report dettagliati</span>
                </li>
              </ul>
              <Link href="/register" className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg text-center block hover:bg-purple-700 transition-colors">
                Scegli Basic
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                €19.99<span className="text-lg text-gray-600">/mese</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">Ricerche illimitate</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">Monitoraggio continuo</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600">Assistenza prioritaria</span>
                </li>
              </ul>
              <Link href="/register" className="w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-lg text-center block hover:bg-gray-200 transition-colors">
                Scegli Pro
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center bg-white rounded-xl p-12 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Inizia subito a proteggere la tua privacy
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Non aspettare che sia troppo tardi. Verifica ora se le tue foto sono online.
          </p>
          <Link href="/search" className="inline-flex items-center bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors">
            <Search className="mr-2 h-5 w-5" />
            Verifica Gratis Ora
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Shield className="h-6 w-6 text-purple-400 mr-2" />
            <span className="text-xl font-bold">FindMyPic</span>
          </div>
          <p className="text-center text-gray-400 mt-4">
            © 2024 FindMyPic. Proteggiamo la tua privacy digitale.
          </p>
        </div>
      </footer>
    </div>
  )
}
