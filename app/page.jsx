import LeadUpload from "./components/LeadUpload";
import FullList from "./components/UploadedFiles";
import "./globals.css";

const HomePage = () => {
  return (
    <div className="mx-10 pt-20">
      <h1>Lead Analysis Dashboard</h1>
      <LeadUpload />
      <FullList />
    </div>
  );
};

export default HomePage;
