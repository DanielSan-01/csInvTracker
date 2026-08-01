import ItemGrid from './components/ItemGrid';

export default function Home() {
  return (
    <section aria-labelledby="home-page-title">
      <h1 id="home-page-title" className="sr-only">
        CS Inventory Tracker dashboard
      </h1>
      <ItemGrid />
    </section>
  );
}

