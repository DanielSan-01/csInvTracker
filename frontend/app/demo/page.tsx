import ItemGrid from '../components/ItemGrid';

export default function DemoPage() {
  return (
    <section aria-labelledby="demo-page-title">
      <h1 id="demo-page-title" className="sr-only">
        CS Inventory Tracker demo
      </h1>
      <ItemGrid demoMode demoUserId={1} />
    </section>
  );
}
