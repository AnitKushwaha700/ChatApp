import React, { useState } from "react";

const SiteHeader = () => {
  const [selectedTheme, setSelectedTheme] = useState("light");

  const handleThemeChange = (e) => {
    const theme = e.target.value;
    setSelectedTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  return (
    <>
      <div className="bg-primary p-2 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary-content text-center">
          Mingo Chat App
        </h1>

        <select
          name="theme"
          id="theme"
          className="select select-bordered w-fit"
          value={selectedTheme}
          onChange={handleThemeChange}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="black">Black</option>
          <option value="spotify">Spotify</option>
          <option value="claude">Claude</option>
          <option value="corporate">Corporate</option>
          <option value="ghibli">Ghibli</option>
          <option value="halloween">Halloween</option>
        </select>
      </div>
    </>
  );
};

export default SiteHeader;