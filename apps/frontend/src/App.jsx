import { RouterProvider } from 'react-router-dom';
import { appRouter } from './router/index.jsx';

export default function App() {
  return <RouterProvider router={appRouter} />;
}
