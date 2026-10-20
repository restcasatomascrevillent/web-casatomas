import { Outlet } from "react-router-dom";

// Keep fixed navigation outside transformed/animated page-sized layers.
// Rendering one route also avoids keeping two complete pages during navigation.
const PageTransition = () => <Outlet />;

export default PageTransition;
