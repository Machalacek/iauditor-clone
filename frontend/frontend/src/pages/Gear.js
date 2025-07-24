import React from "react";
import { GearTable } from "../components/GearTable";

// Accept setSelectedGear and setCurrentPage as props!
const Gear = ({ setSelectedGear, setCurrentPage }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <GearTable setSelectedGear={setSelectedGear} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default Gear;
