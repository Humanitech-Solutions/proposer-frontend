import React, { useEffect, useState } from "react";
import CollapsibleNavbar from "./components/Navbar";
import Login from "./components/Login";
import Home from "./components/Home";
import ListView from "./components/ListView";
import { Route, Routes } from "react-router-dom";
import axiosInstance from "./axios";
import { useNavigate } from "react-router-dom";
import Create from "./components/Create";

import "./App.css";
import Logout from "./components/Logout";
import Delete from "./components/Delete";
import { ComplianceListV2} from "./components/tools/index";
import ListViewTemplates from "./components/Template";

function App() {
  const navigate = useNavigate();
  const [proposalData, setProposalData] = useState({
    loading: false,
    res: [],
    exampleproposal: null,
    error: null,
  });
  const [templateData, setTemplateData] = useState([])

  useEffect(() => {
    setProposalData({ loading: true });
    axiosInstance
      .get("proposals/")
      .catch((error) => {
        console.log(error);
        // window.location.href = '/login';
      })
      .then((res) => {
        const apiRes = res.data;
        setProposalData({
          loading: false,
          res: apiRes,
          exampleproposal: apiRes["0"],
        });
      });
      axiosInstance
        .get('proposals/template/')
        .catch((error) => {
          console.log(error);
          // window.location.href = '/login';
        })
        .then((res) => {
          const apiRes = res.data;
          console.log(apiRes)
          setTemplateData(apiRes);
        });
  }, [setProposalData, navigate]);

  return (
    <>
      <CollapsibleNavbar count={proposalData.res} />
      <div className="App">
        <Routes>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route
            path="/proposals"
            element={<ListView proposals={proposalData.res} />}
          />
          <Route path="/proposals/:pk" element={<ComplianceListV2 proposals={proposalData.res} templates={templateData}/>} />
          <Route
            path="/proposals/create"
            element={<Create proposals={proposalData.exampleproposal} />}
          />
          <Route
            path="/proposals/:pk/delete"
            element={<Delete proposals={proposalData.res} />}
          />
          <Route
            path="/templates"
            element={<ListViewTemplates templates={templateData} />}
          />
        </Routes>
      </div>
    </>
  );
}

export default App;
