import { Link } from "react-router-dom";

function Login() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="text-3xl font-bold text-center">
            Welcome Back
          </h2>

          <p className="text-center text-base-content/60 mb-4">
            Login to your ChatApp account
          </p>

          <form className="space-y-4">
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
                placeholder="Enter your password"
                className="input input-bordered w-full"
              />
            </div>

            {/* Login */}
            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              Login
            </button>
          </form>

          <div className="divider">OR</div>

          <p className="text-center">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-primary font-semibold"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;