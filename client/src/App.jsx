import React from "react";
import Header from "./components/Header";

const App = () => {
  return (
    <>
      <>
        <Header />
        <main className="min-h-screen bg-base-100 text-base-content flex items-center justify-center">
          <h1 className="text-4xl font-bold">Welcome to ChatApp</h1>
        </main>
      </>
    </>
  );
};

export default App;
