import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div>
      <h2>404 - Page not found</h2>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  );
};

export default NotFoundPage;
