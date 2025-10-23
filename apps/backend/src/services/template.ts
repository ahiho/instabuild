export class TemplateService {
  generateBasicTemplate(title: string): string {
    return `import React from 'react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 id="main-title" className="text-5xl font-bold text-gray-900 mb-6">
            ${title}
          </h1>
          <p id="main-subtitle" className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Welcome to your new landing page. Start editing by describing what you'd like to change!
          </p>
          <button id="cta-button" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
            Get Started
          </button>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div id="feature-1" className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Fast</h3>
            <p className="text-gray-600">Lightning-fast performance for the best user experience.</p>
          </div>
          
          <div id="feature-2" className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">Beautiful</h3>
            <p className="text-gray-600">Stunning designs that convert visitors into customers.</p>
          </div>
          
          <div id="feature-3" className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Responsive</h3>
            <p className="text-gray-600">Perfect on all devices, from mobile to desktop.</p>
          </div>
        </div>
      </div>
    </div>
  )
}`;
  }
}
