import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-2xl px-6 pt-10 pb-16 sm:pb-24">
      <Nav />
      <main className="mt-12">{children}</main>
      <Footer />
    </div>
  );
}
