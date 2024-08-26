import LeadUpload from "./components/LeadUpload";
import FullList from "./components/UploadedFiles";

const HomePage = () => {
  return (
    <div>
      <h1>Lead Analysis Dashboard</h1>
      <LeadUpload />
      <FullList />
    </div>
  );
};

export default HomePage;
