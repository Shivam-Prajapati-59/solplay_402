import Hero from "@/components/landing/Hero";
import UserBar from "@/components/landing/UserBar";
import Creators from "@/components/landing/Cretors";
import Strips from "@/components/landing/Strips";
import MovieList from "@/components/landing/MoviesList";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="pt-15 px-4 sm:px-6 lg:px-8">
      <Hero />
      <UserBar />
      <Creators />
      <Strips />
      <MovieList />
      <Footer />
    </div>
  );
}
