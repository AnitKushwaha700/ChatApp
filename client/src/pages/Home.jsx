import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="min-h-[calc(100vh-65px)] bg-base-200 flex items-center">
      <div className="container mx-auto px-6 py-16">
        
        <div className="max-w-3xl mx-auto text-center">

          {/* Badge */}
          <div className="badge badge-primary badge-lg mb-6">
            Simple • Fast • Secure
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Connect.
            <span className="text-primary"> Chat.</span>
            <br />
            Share.
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg md:text-xl text-base-content/70 max-w-2xl mx-auto">
            Chat with your friends, share messages, and stay
            connected with a simple and modern messaging experience.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            
            <Link
              to="/register"
              className="btn btn-primary btn-lg"
            >
              Get Started
            </Link>

            <Link
              to="/login"
              className="btn btn-outline btn-lg"
            >
              Login
            </Link>

          </div>

        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20">

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center">
              <div className="text-4xl mb-2">💬</div>
              <h2 className="card-title justify-center">
                Real-time Chat
              </h2>
              <p className="text-base-content/60">
                Send and receive messages with your friends.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center">
              <div className="text-4xl mb-2">🔒</div>
              <h2 className="card-title justify-center">
                Secure
              </h2>
              <p className="text-base-content/60">
                Your conversations and account stay protected.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h2 className="card-title justify-center">
                Fast & Simple
              </h2>
              <p className="text-base-content/60">
                A clean interface designed for quick conversations.
              </p>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}

export default Home;