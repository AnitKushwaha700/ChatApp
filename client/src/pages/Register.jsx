import { Link } from "react-router-dom";

function Register() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="text-3xl font-bold text-center">
            Create Account
          </h2>

          <p className="text-center text-base-content/60 mb-4">
            Create your ChatApp account
          </p>

          <form className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">
                <span className="label-text">Name</span>
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                className="input input-bordered w-full"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">
                <span className="label-text">Email</span>
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                className="input input-bordered w-full"
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">
                <span className="label-text">Password</span>
              </label>

              <input
                type="password"
                placeholder="Create a password"
                className="input input-bordered w-full"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>

              <input
                type="password"
                placeholder="Confirm your password"
                className="input input-bordered w-full"
              />
            </div>

            {/* Register */}
            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              Create Account
            </button>
          </form>

          <div className="divider">OR</div>

          <p className="text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-semibold"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;