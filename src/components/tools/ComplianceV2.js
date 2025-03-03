import Col from "react-bootstrap/Col";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Tab from "react-bootstrap/Tab";
import { useDropzone } from "react-dropzone";
import "../../App.css";
import "./ComplianceV2.css";
import Button from "react-bootstrap/Button";
import React, { useEffect, useState, useRef } from "react";
import axiosInstance from "../../axios";
import Loading from "../Loading";
import LoadingBar from "../LoadingBar";
import Dropdown from "react-bootstrap/Dropdown";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";

import TextAreaAutoSize from "react-textarea-autosize";

import DeleteProposalModal from "./DeleteProposalModal";

import {
  faPenToSquare,
  faTrashCan,
  faUndo,
  faPlus,
  faX,
  faFloppyDisk,
  faClockRotateLeft,
  faFlag,
  faFileCsv,
  faArrowsUpToLine,
  faObjectUngroup,
  faRefresh
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Tabs from "react-bootstrap/Tabs";
import Container from "react-bootstrap/esm/Container";

import { Configuration, OpenAIApi } from "openai";
import { useParams } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Outline from "./Outline";
import Table from "react-bootstrap/Table";
import InputGroup from "react-bootstrap/InputGroup";
import CsvDownloadButton from "react-json-to-csv";
import Splitter from "./Splitter";
import BootstrapSwitchButton from 'bootstrap-switch-button-react';
import LoadingChecklist from "../LoadingChecklist";

import { useNavigate } from "react-router-dom";

function ComplianceListV2({proposals, templates}) {
  const { pk } = useParams();
  const [editMode, updateEditMode] = useState(false);
  const [proposalData, updateProposalData] = useState(false);
  const [complianceData, updateComplianceData] = useState();
  const [splitMode, updateSplitMode] = useState({
    "set": false,
    "itemRef": {}
  });
  const [sectionData, updateSectionData] = useState();
  const [activeSectionData, updateActiveSectionData] =
    useState("Section Filters");
  const [aiPrompts, updateAiPrompts] = useState([
    "Summarize the following text for me",
  ]);
  const [activeAiPrompt, updateActiveAiPrompt] = useState("");
  const [aiData, updateAiData] = useState([]);
  const [runningTrigger, updateRunningTrigger] = useState(false);
  const [checklistData, updateChecklistData] = useState([]);
  const [searchInput, updateSearchInput] = useState("");
  const [complianceDataOriginal, updateComplianceDataOriginal] = useState();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const imageRef = useRef(null);

  const [selectedTemplate, setSelectedTemplate] = useState({"name": "AI Templates"});
  const [aiEnabled, updateAiEnabled] = useState(false);

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    maxFiles: 1,
  });
  const [startPage, updateStartPage] = useState(false);
  const [endPage, updateEndPage] = useState(false);

  const[merged, setMerged] = useState(false);

  const getHierarchy = (title) => {
    const match = title.match(/_(\d+(\.\d+)*)_/);
    return match ? match[1] : '';
  };

  function sortByHierarchy(objects) {
    return objects.sort((a, b) => {
  
      const hierarchyA = getHierarchy(a.title);
      const hierarchyB = getHierarchy(b.title);
  
      const splitAndParse = (hierarchy) => hierarchy.split('.').map(parseFloat);
  
      const hierarchyArrayA = splitAndParse(hierarchyA);
      const hierarchyArrayB = splitAndParse(hierarchyB);
  
      for (let i = 0; i < Math.max(hierarchyArrayA.length, hierarchyArrayB.length); i++) {
        const numA = hierarchyArrayA[i] || 0;
        const numB = hierarchyArrayB[i] || 0;
  
        if (numA !== numB) {
          return numA - numB;
        }
      }
  
      return hierarchyArrayA.length - hierarchyArrayB.length;
    });
  }

  const refreshPage = () => {
    axiosInstance
      .get(`/proposals/${pk}`)
      .catch((error) => {
        console.log(error);
      })
      .then((res) => {
        var resDataCopy = { ...res.data };
        updateProposalData(resDataCopy);
        updateComplianceData(sortByHierarchy(resDataCopy.complianceimages_set));
        updateComplianceDataOriginal(sortByHierarchy(resDataCopy.complianceimages_set));
        updateSectionData(resDataCopy.compliance_sections);
        updateChecklistData(resDataCopy.checklist);
        updateRunningTrigger(resDataCopy.loading);
        updateSplitMode({"set": false, "itemRef": {}});
      });
  };

  useEffect(refreshPage, [updateProposalData, pk]);

  const [addingSection, updateAddingSection] = useState({
    adding: false,
    section: null,
    start: null,
    end: null,
  });

  const [addingPrompt, updateAddingPrompt] = useState({
    adding: false,
    prompt: null,
  });

  const [focusData, updateFocusData] = useState({
    focusing: false,
    data: {},
  });

  const files = acceptedFiles.map((file) => (
    <li key={file.path}>
      {file.path} - {file.size} - {file.type} bytes
    </li>
  ));

  const handleUpdateStartPage = (e) => {
    updateStartPage(e.target.value);
  };

  const handleUpdateEndPage = (e) => {
    updateEndPage(e.target.value);
  };

  const handleSubmitNofo = (e) => {
    e.preventDefault();
    if (acceptedFiles[0] == null) {
      alert("Please input a PDF");
    } else if (startPage === false) {
      alert("Please input a Start page for the PDF document processor");
    } else if (endPage === false) {
      alert("Please input an End page for the PDF document processor");
    } else if (parseInt(startPage) < 1) {
      alert("Start Page must be greater than 0");
    } else if (parseInt(endPage) < 1) {
      alert("End Page must be greater than 0");
    } else if (parseInt(startPage) >= parseInt(endPage)) {
      alert("The Start Page must be less than the End Page");
      console.log(startPage >= endPage);
      console.log(endPage);
    } else {
      console.log(selectedTemplate.checklist)
      console.log(typeof JSON.stringify(selectedTemplate.checklist))
      console.log(typeof selectedTemplate.checklist)
      updateRunningTrigger(true);
      let formData = new FormData();
      formData.append("title", proposalData.title);
      formData.append("nofo", acceptedFiles[0]);
      formData.append("doc_start", startPage);
      formData.append("doc_end", endPage);
      formData.append("loading", "True");
      if(aiEnabled){
        formData.append("checklist", JSON.stringify(selectedTemplate.checklist))
      }
      axiosInstance.defaults.headers["Content-Type"] = "multipart/form-data";
      axiosInstance.defaults.timeout = 2000000; // axiosInstance.timeout = 2000000;
      axiosInstance
        .put(`proposals/${pk}/update/`, formData)
        .catch((error) => {
          axiosInstance.defaults.headers["Content-Type"] = "application/json";
          axiosInstance.defaults.timeout = 30000;
          console.log(error);
        })
        .then((res) => {
          axiosInstance.defaults.headers["Content-Type"] = "application/json";
          axiosInstance.defaults.timeout = 30000;
          console.log(res);
        });
    }
  };

  const handleFocus = (id) => {
    const result = complianceData.find((obj) => {
      return obj.id === parseInt(id);
    });
    const resultCopy = result;
    console.log(result);
    updateFocusData({
      focusing: true,
      data: resultCopy,
    });
  };

  //drag reference: https://www.cssportal.com/html-event-attributes/ondrop.php
  const handleDrag = (e) => {
    console.log(e.target.name);
    e.dataTransfer.setData("name", e.target.name);
  };

  const handleDragSection = (e, id) => {
    console.log(id);
    e.dataTransfer.setData("sec_id", id);
  };

  const handleAllowDrop = (e) => {
    e.preventDefault();
  };


  const handleDropSection = async (e) => {
    if (e.dataTransfer.getData("name")) {
      var id = e.dataTransfer.getData("name");
      const cklistcopy = [...checklistData];
      console.log(e.target.name);
      var specificComplianceItem = complianceData.find((item) => {
        return item.id === parseInt(id);
      });
      const objIndex = cklistcopy.findIndex(
        (obj) => obj.id === parseInt(e.target.name),
      );
      cklistcopy[objIndex].data = cklistcopy[objIndex].data.concat(
        specificComplianceItem.content_text,
        "\n",
      );
      console.log(cklistcopy[objIndex])
      console.log(specificComplianceItem.page_number)
      cklistcopy[objIndex].page = cklistcopy[objIndex].page.concat(
        specificComplianceItem.page_number,
        ", ",
      );
      console.log(cklistcopy);
      updateChecklistData(cklistcopy);
    } else {
      console.log("second");
      var current = parseInt(e.dataTransfer.getData("sec_id"));
      var target = parseInt(e.target.name.split("_")[0]);
      console.log(current); //current
      console.log(target); //target
      const cklistcopy = [...checklistData];
      const newcklist = [];
      if (current > target) {
        cklistcopy.map((item) => {
          if (item.id < target) {
            newcklist.push(item);
          } else if (item.id === current) {
            var itemCopy = { ...item };
            itemCopy.id = target;
            newcklist.push(itemCopy);
          } else if (item.id >= target && item.id < current) {
            var itemCopy = { ...item };
            itemCopy.id += 1;
            newcklist.push(itemCopy);
          } else {
            newcklist.push(item);
          }
        });
        newcklist.sort((a, b) => a.id - b.id);
        console.log(newcklist);
      } else {
        cklistcopy.map((item) => {
          if (item.id < current) {
            newcklist.push(item);
          } else if (item.id === current) {
            var itemCopy = { ...item };
            itemCopy.id = target - 1;
            newcklist.push(itemCopy);
          } else if (item.id > current && item.id < target) {
            var itemCopy = { ...item };
            itemCopy.id -= 1;
            newcklist.push(itemCopy);
          } else {
            newcklist.push(item);
          }
        });
        newcklist.sort((a, b) => a.id - b.id);
        console.log(newcklist);
      }
      updateChecklistData(newcklist);
    }
  };

  const handleDropDelete = (e) => {
    if (e.dataTransfer.getData("name")) {
      const id = e.dataTransfer.getData("name");
      const filteredComplianceArray = complianceData.filter((obj) => {
        return obj.id !== parseInt(id);
      });
      updateComplianceData(filteredComplianceArray);
      updateComplianceDataOriginal(filteredComplianceArray);
      axiosInstance
        .delete(`proposals/${pk}/compliance/${id}/delete/`)
        .catch((error) => {
          console.log(error.response);
        })
        .then((res) => {
          console.log(res);
        });
    } else {
      const id = e.dataTransfer.getData("sec_id");
      const filteredChecklistArray = checklistData.filter((obj) => {
        return obj.id !== parseInt(id);
      });
      updateChecklistData(filteredChecklistArray);
    }
  };

  const handleChangeNewSection = (e) => {
    var addingSectionCopy = addingSection;
    console.log(e.target.value.trim());
    addingSectionCopy[e.target.name] = e.target.value.trim();
    updateAddingSection(addingSectionCopy);
  };

  const handleSubmitNewSection = () => {
    var copySectionData = sectionData;
    copySectionData[addingSection.section] = [
      parseInt(addingSection.start),
      parseInt(addingSection.end),
    ];
    console.log(copySectionData);
    updateSectionData(copySectionData);
    updateAddingSection({
      adding: false,
      section: null,
      start: null,
      end: null,
    });
    axiosInstance
      .put(`proposals/${pk}/update/`, {
        title: proposalData.title,
        compliance_sections: sectionData,
      })
      .catch((error) => {
        console.log(error.response);
      })
      .then((res) => {
        console.log(res);
      });
  };

  const handleActiveFilter = (e) => {
    if (e.target.name.includes("flagged")) {
      updateActiveSectionData("Flagged Content");
      const complianceDataCopy = complianceData;
      const filteredComplianceData = complianceDataCopy.filter((item) =>
        item.flagged.includes("red"),
      );
      updateComplianceData(filteredComplianceData);
    } else {
      updateActiveSectionData(e.target.name);
      var filterPages = sectionData[e.target.name];
      var filteredComplianceData = complianceData.filter(
        (item) =>
          item.page_number >= filterPages[0] &&
          item.page_number <= filterPages[1],
      );
      updateComplianceData(filteredComplianceData);
    }
  };

  const handleSplitMode = (e) => {
    updateSplitMode(e);
    console.log(imageRef)
  };

  const handleMerge = (item) => {
    const index = complianceData.findIndex((obj) => obj.id == item.item.id);
    if(index > 0){
      setMerged(true);
      const parent = complianceData[index -1]
      const child = complianceData[index]
      console.log(parent)
      console.log(child)
      let formData = new FormData();
      formData.append("proposal", parent.proposal);
      formData.append("parent_id", parent.id);
      formData.append("id", child.id);
      formData.append("hierarchy", getHierarchy(parent.content));
      formData.append("process", "merge")
      axiosInstance
      .post(`proposals/${pk}/compliance/`, formData, {headers: { 'Content-Type': 'multipart/form-data'}})
      .catch((error) => {
        console.log(error.response);
      })
      .then((res) => {
        console.log(res);
        refreshPage();
        setMerged(false);
        window.location.reload();
      })
    } else {
      alert("Can only merge when there is a section prior to the selected section")
    }
  }

  const handleChangeProposalTitle = (e) => {
    let proposalDataCopy = { ...proposalData };
    proposalDataCopy.title = e.target.value;
    updateProposalData(proposalDataCopy);
  };

  const textAreaRef = useRef(null);

  const handleEditMode = (e) => {
    if (e) {
      updateEditMode(e);
      textAreaRef.current && textAreaRef.current.focus();
    } else {
      updateEditMode(e);
      axiosInstance
        .put(`proposals/${pk}/update/`, {
          title: proposalData.title,
        })
        .catch((error) => {
          console.log(error.response);
        })
        .then((res) => {
          console.log(res);
        });
    }
  };

  const handleSubmitCompliance = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target),
      formDataObj = Object.fromEntries(formData.entries());
    let focusDataCopy = focusData.data;
    delete focusDataCopy.title;
    delete focusDataCopy.content;
    axiosInstance
      .put(`proposals/${pk}/compliance/${focusData.data.id}/update/`, {
        ...focusDataCopy,
        title_text: formDataObj.title,
        content_text: formDataObj.content,
      })
      .catch((error) => {
        console.log(error.response);
      })
      .then((res) => {
        console.log(res);
      });
  };

  const handleChangeCompliance = (e) => {
    const focusDataCopy = focusData.data;
    if (e.target.name.includes("title")) {
      focusDataCopy.title_text = e.target.value;
    } else {
      focusDataCopy.content_text = e.target.value;
    }
    updateFocusData({ focusing: true, data: focusDataCopy });
  };

  const handleFlagged = (id) => {
    const complianceDataCopy = [...complianceData];
    const itemIndex = complianceDataCopy.findIndex((item) => {
      return item.id === parseInt(id);
    });
    if (complianceDataCopy[itemIndex].flagged.includes("white")) {
      complianceDataCopy[itemIndex].flagged = "red";
    } else {
      complianceDataCopy[itemIndex].flagged = "white";
    }
    updateComplianceData(complianceDataCopy);
    axiosInstance
      .put(`proposals/${pk}/compliance/${id}/update/`, {
        proposal: complianceDataCopy[itemIndex].proposal,
        flagged: complianceDataCopy[itemIndex].flagged,
      })
      .catch((error) => {
        console.log(error.response);
      })
      .then((res) => {
        console.log(res);
      });
  };

  const handleAddToChecklist = () => {
    var checklistCopy = [...checklistData];
    var maxId = Math.max(...checklistCopy.map((o) => o.id));
    checklistCopy.push({ item: "", id: maxId + 1, data: "", page: "" });
    updateChecklistData(checklistCopy);
  };

  const handleChecklistChange = (e) => {
    var checklistCopy = [...checklistData];
    const items = e.target.name.split("_");
    const index = checklistCopy.findIndex(
      (obj) => obj.id === parseInt(items[0]),
    );
    checklistCopy[index][items[1]] = e.target.value;
    console.log(checklistCopy);
    updateChecklistData(checklistCopy);
  };

  const handleSaveChecklist = () => {
    var checklistCopy = [...checklistData];
    axiosInstance
      .put(`proposals/${pk}/update/`, {
        title: proposalData.title,
        checklist: checklistCopy,
      })
      .catch((error) => {
        console.log(error.response);
      })
      .then((res) => {
        console.log(res);
        alert(`Compliance Checklist Saved for ${proposalData.title}!`);
      });
  };

  const handleNofoSearch = (e) => {
    if (e.target.value.toLowerCase().length === 0) {
      updateSearchInput("");
      updateComplianceData(complianceDataOriginal);
    } else {
      updateSearchInput(e.target.value.toLowerCase());
      var complianceDataOriginalCopy = [...complianceDataOriginal];
      const filteredData = complianceDataOriginalCopy.filter((item) => {
        if (item.title_text.toLowerCase().includes(searchInput)) {
          return item;
        }
      });
      updateComplianceData(filteredData);
    }
  };

  return (
    <>
      {proposalData ? (
        <Tab.Container
          id="list-group-tabs"
          defaultActiveKey="#link1"
        >
          <Row>
            <Col
              className="d-flex justify-content-start bg-dark flex-column align-content-center"
              lg={2}
              style={{zoom: "74%", height: "150vh"}}
            >
              <ListGroup style={{ marginLeft: "1vw"}}>
                <ListGroup.Item>
                  <Container>
                    <Container>
                      <TextAreaAutoSize
                        className="titleInputTextArea"
                        ref={textAreaRef}
                        style={{
                          maxWidth: "100%",
                          height: "50%",
                          overflow: "hidden",
                          resize: "none",
                          border: editMode
                            ? "2px solid #000000"
                            : "2px solid transparent",
                          boxSizing: "border-box",
                          cursor: editMode ? "text" : "default",
                        }}
                        readOnly={!editMode}
                        onChange={handleChangeProposalTitle}
                        value={proposalData.title}
                      />
                      <div
                        onClick={() => handleEditMode(!editMode)}
                        style={{ height: "50%" }}
                      >
                        <FontAwesomeIcon
                          icon={editMode ? faFloppyDisk : faPenToSquare}
                          size="xs"
                        />
                      </div>
                    </Container>
                  </Container>
                </ListGroup.Item>
                <ListGroup.Item action href="#link1">
                  Viewer
                </ListGroup.Item>
                {proposalData.nofo ? (
                  <>
                    <ListGroup.Item action href="#link2">
                      Checklist
                    </ListGroup.Item>
                    <ListGroup.Item action href="#link3">
                      Outline
                    </ListGroup.Item>
                  </>
                ) : (
                  <></>
                )}
              </ListGroup>
              <hr />
              <ListGroup style={{ marginLeft: "1vw"}}>
                <ListGroup.Item>
                  <Button
                    style={{ backgroundColor: "#f44336", color: "white"}}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete
                  </Button>
                  <DeleteProposalModal
                    show={showDeleteModal}
                    setShow={setShowDeleteModal}
                    proposalData={proposalData}
                  />
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col lg={10}>
              <Tab.Content className="h-100vh">
                <Tab.Pane eventKey="#link1">
                  {proposalData ? (
                    (proposalData.nofo && proposalData.complianceimages_set.length > 0) ? (
                      focusData.focusing ? (
                        //focusing
                        <Form onSubmit={(e) => handleSubmitCompliance(e)}>
                          <Button
                            style={{
                              marginRight: "1vw",
                              marginTop: "5px",
                              backgroundColor: "#9ab6da",
                            }}
                            onClick={() =>
                              updateFocusData({ focusing: false, data: {} })
                            }
                          >
                            <FontAwesomeIcon icon={faUndo} />
                          </Button>
                          <Button
                            type="submit"
                            style={{ marginLeft: "1vw", marginTop: "5px" }}
                          >
                            <FontAwesomeIcon icon={faFloppyDisk} />
                          </Button>
                          <Tabs
                            defaultActiveKey="title"
                            id="uncontrolled-tab-focus"
                            className="mb-3"
                          >
                            <Tab eventKey="title" title="Title">
                              <Row>
                                <Col>
                                  <Form.Control
                                    onChange={(e) => handleChangeCompliance(e)}
                                    style={{ height: "85vh", width: "100%" }}
                                    as="textarea"
                                    name="title"
                                    defaultValue={focusData.data.title_text}
                                  />
                                </Col>
                                <Col>
                                  <img
                                    src={focusData.data.title}
                                    alt="header visual"
                                    width="400"
                                    height="auto"
                                  />
                                </Col>
                              </Row>
                            </Tab>
                            <Tab eventKey="content" title="Content">
                              <Row>
                                <Col>
                                  <Form.Control
                                    onChange={(e) => handleChangeCompliance(e)}
                                    style={{ height: "85vh", width: "100%" }}
                                    as="textarea"
                                    name="content"
                                    defaultValue={focusData.data.content_text}
                                  />
                                </Col>
                                <Col>
                                  <img
                                    src={focusData.data.content}
                                    alt="content visual"
                                    width="100%"
                                    height="auto"
                                  />
                                </Col>
                              </Row>
                            </Tab>
                          </Tabs>
                        </Form>
                      ) : ( splitMode.set ? <Splitter item={splitMode.itemRef} refresh={refreshPage} updateSplitMode={updateSplitMode}/> :
                        //viewing
                        <>
                          <Tab.Container
                            id="list-group-tabs"
                            defaultActiveKey="#link1"
                          >
                            <Row style={{marginTop: "1vh", zoom: "74%"}}>
                              <Col
                                sm={4}
                                className="overflow-auto"
                                style={{ maxHeight: "125vh" }}
                              >
                                <ListGroup>
                                  <InputGroup className="mb-1">
                                    <InputGroup.Text>
                                      Header Search
                                    </InputGroup.Text>
                                    <Form.Control
                                      aria-label="search"
                                      value={searchInput}
                                      onChange={(e) => handleNofoSearch(e)}
                                    />
                                  </InputGroup>
                                  <Row className="mb-3 g-1">
                                  <Col>
                                  <Dropdown>
                                    <Dropdown.Toggle
                                      style={{ backgroundColor: "white" , width: "100%"}}
                                      id="dropdown-basic"
                                    >
                                      {activeSectionData}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu style={{width: "100%"}}>
                                      {Object.keys(sectionData)?.map(
                                        (item, index) => {
                                          return (
                                            <Dropdown.Item
                                              name={item}
                                              key={index}
                                              onClick={(e) => handleActiveFilter(e)}
                                            >
                                              {item}: {sectionData[item][0]}-
                                              {sectionData[item][1]}
                                            </Dropdown.Item>
                                          );
                                        },
                                      )}
                                      <Dropdown.Item
                                        name="flagged"
                                        onClick={(e) => handleActiveFilter(e)}
                                      >
                                        <FontAwesomeIcon color="red" icon={faFlag} />{" "}
                                        Flagged Content
                                      </Dropdown.Item>
                                      {addingSection.adding ? (
                                        <Container
                                          style={{
                                            paddingTop: "1vh",
                                            borderTop: "3px solid rgb(212, 212, 212)",
                                            display: "flex",
                                            flexDirection: "column",
                                            width: "100%"
                                          }}
                                        >
                                          <textarea
                                            type="text"
                                            name="section"
                                            placeholder="Section Name"
                                            onChange={(e) =>
                                              handleChangeNewSection(e)
                                            }
                                          />
                                          <input
                                            type="number"
                                            name="start"
                                            placeholder="Page Start (Number Only)"
                                            onChange={(e) =>
                                              handleChangeNewSection(e)
                                            }
                                          />
                                          <input
                                            type="number"
                                            name="end"
                                            placeholder="Page End (Number Only)"
                                            onChange={(e) =>
                                              handleChangeNewSection(e)
                                            }
                                          />
                                          <Row>
                                            <Dropdown.Item
                                              onClick={() => handleSubmitNewSection()}
                                            >
                                              <FontAwesomeIcon
                                                size="sm"
                                                icon={faFloppyDisk}
                                              />
                                            </Dropdown.Item>
                                            <Dropdown.Item
                                              onClick={() =>
                                                updateAddingSection({
                                                  adding: false,
                                                  section: null,
                                                  start: null,
                                                  end: null,
                                                })
                                              }
                                            >
                                              <FontAwesomeIcon size="sm" icon={faX} />
                                            </Dropdown.Item>
                                          </Row>
                                        </Container>
                                      ) : (
                                        <>
                                          <Dropdown.Item
                                            onClick={() => {
                                              updateComplianceData(
                                                proposalData.complianceimages_set,
                                              );
                                              updateActiveSectionData(
                                                "Section Filters",
                                              );
                                            }}
                                          >
                                            <FontAwesomeIcon
                                              size="sm"
                                              icon={faClockRotateLeft}
                                            />{" "}
                                            Reset
                                          </Dropdown.Item>
                                          <Dropdown.Item
                                            onMouseEnter={() =>
                                              updateAddingSection({
                                                ...addingSection,
                                                adding: true,
                                              })
                                            }
                                          >
                                            <FontAwesomeIcon
                                              size="sm"
                                              icon={faPlus}
                                            />{" "}
                                            Add
                                          </Dropdown.Item>
                                        </>
                                      )}
                                    </Dropdown.Menu>
                                  </Dropdown>
                                  </Col>
                                  <Col
                                    onDragOver={(e) => handleAllowDrop(e)}
                                    onDrop={(e) => handleDropDelete(e)}
                                  >
                                  <Button style={{
                                      border: "1px solid #f44336",
                                      borderRadius: "5px",
                                      width: "100%",
                                      backgroundColor: "white"
                                    }}>
                                    <FontAwesomeIcon size="xl" icon={faTrashCan} />
                                  </Button>
                                  </Col>
                                  </Row>
                                  {complianceData?.map((item, index) => {
                                    return (
                                      <OverlayTrigger
                                        placement="right"
                                        key={index}
                                        delay={{ show: 400, hide: 100 }}
                                        overlay={
                                          <Popover className="custom-pover" style={{zoom: "74%"}}>
                                            <Popover.Header
                                              as="h3"
                                              className="custom-pover-header"
                                            >{`Page #${item.page_number} (Double Click for Text Editor)`}</Popover.Header>
                                            <Popover.Body className="custom-pover-body">
                                              <div>{item.title_text}</div>
                                            </Popover.Body>
                                          </Popover>
                                        }
                                      >
                                        {item.content_text.length === 0 ||
                                        item.content_text === "\f" ? (
                                          <ListGroup.Item
                                            className="d-flex justify-content-center bg-dark"
                                            action
                                            name={item.id}
                                            key={index}
                                            href={`#link${index}`}
                                            draggable="false"
                                            onDragStart={(e) => handleDrag(e)}
                                            onDoubleClick={() =>
                                              handleFocus(item.id)
                                            }
                                          >
                                            <FontAwesomeIcon
                                              onClick={() =>
                                                handleFlagged(item.id)
                                              }
                                              style={{ marginRight: "2px" }}
                                              color={item.flagged}
                                              size="sm"
                                              icon={faFlag}
                                            />
                                            <img
                                              src={item.title}
                                              name={item.id}
                                              alt={index}
                                              style={{
                                                maxWidth: "50vh",
                                                height: "auto",
                                                borderRadius: "5px",
                                              }}
                                            />
                                          </ListGroup.Item>
                                        ) : (
                                          <ListGroup.Item
                                            className="d-flex justify-content-center"
                                            action
                                            name={item.id}
                                            key={index}
                                            href={`#link${index}`}
                                            draggable="true"
                                            onDragStart={(e) => handleDrag(e)}
                                            onDoubleClick={() =>
                                              handleFocus(item.id)
                                            }
                                          >
                                            <FontAwesomeIcon
                                              onClick={() =>
                                                handleFlagged(item.id)
                                              }
                                              style={{ marginRight: "2px" }}
                                              color={item.flagged}
                                              size="sm"
                                              icon={faFlag}
                                            />
                                            <img
                                              src={item.title}
                                              name={item.id}
                                              alt={index}
                                              style={{
                                                maxWidth: "50vh",
                                                height: "auto",
                                                borderRadius: "5px",
                                              }}
                                            />
                                          </ListGroup.Item>
                                        )}
                                      </OverlayTrigger>
                                    );
                                  })}
                                </ListGroup>
                              </Col>
                                <Col
                                  sm={8}
                                  className="overflow-auto"
                                  style={{ maxHeight: "125vh" }}
                                >
                                  { merged ? <Loading /> :
                                  <Tab.Content>
                                    {complianceData?.map((item, index) => {
                                      return (
                                            <Tab.Pane
                                              key={index}
                                              eventKey={`#link${index}`}
                                            >
                                              <Col>
                                              <Row style={{marginBottom: "4vh", borderBottom: "5px solid #708090"}}>
                                                <Col className="d-flex flex-row justify-content-center mb-3">
                                                  <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 1000, hide: 50 }}
                                                    overlay={
                                                      <Popover style={{backgroundColor: "#66ab57", zoom: "74%"}} className="custom-pover">
                                                        <Popover.Body style={{backgroundColor: "white"}} className="custom-pover-body">
                                                          <div>Merge Image</div>
                                                        </Popover.Body>
                                                      </Popover>
                                                    }>
                                                    <Button><FontAwesomeIcon size="xl" onClick={() => handleMerge({item})} icon={faArrowsUpToLine} /></Button>
                                                  </OverlayTrigger>
                                                  <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 1000, hide: 50 }}
                                                    overlay={
                                                      <Popover style={{backgroundColor: "#66ab57", zoom: "74%"}} className="custom-pover">
                                                        <Popover.Body style={{backgroundColor: "white"}} className="custom-pover-body">
                                                          <div>Split Image</div>
                                                        </Popover.Body>
                                                      </Popover>
                                                    }>
                                                    <Button style={{marginLeft: "2vw", marginRight: "4vw"}} onClick={() =>handleSplitMode({"set": true, "itemRef": item})}><FontAwesomeIcon size="xl" icon={faObjectUngroup} /></Button>
                                                  </OverlayTrigger>
                                                </Col>
                                              </Row>
                                              <img
                                                ref={imageRef}
                                                src={item.content}
                                                alt={index}
                                              />
                                              </Col>
                                            </Tab.Pane>
                                      );
                                    })}
                                  </Tab.Content>
                                  }
                                </Col>
                            </Row>
                          </Tab.Container>
                        </>
                      )
                    ) : //Loading
                    runningTrigger ? (
                      <Container style={{height: "100vh", width: "auto"}} className="d-flex justify-content-center align-items-center">
                        <LoadingBar pk={pk} refresh={refreshPage}/>
                      </Container>
                    ) : (
                      //Initial NOFO Input
                        <Form
                          style={{
                            marginRight: "100px",
                            marginLeft: "100px",
                            marginTop: "5vh",
                          }}
                        >
                          <Row className="d-flex align-items-center justify-content-center">
                            <Col
                              style={{
                                maxWidth: "500px",
                                backgroundColor: "hsl(1,0%,90%)",
                                padding: "20px",
                                borderRadius: "7px",
                                margin: "10px",
                              }}
                            >
                              <Form.Label style={{ fontSize: "20px" }}>
                                PDF Document Processor
                              </Form.Label>
                              <hr />
                              <Form.Group className="mb-3 form-group">
                                <div
                                  {...getRootProps({ className: "dropzone" })}
                                >
                                  <input
                                    className="input-zone"
                                    name="nofo"
                                    {...getInputProps()}
                                  />
                                  <div className="text-center">
                                    <p className="dropzone-content">
                                      {acceptedFiles[0]
                                        ? files
                                        : "Add your PDF Here"}
                                    </p>
                                  </div>
                                </div>
                              </Form.Group>
                              <hr />
                              <Form.Group className="mb-3 d-flex flex-row justify-content-center">
                                <Form.Control
                                  type="number"
                                  name="start#"
                                  placeholder="Start Page"
                                  style={{marginLeft:"4vw", marginRight: "4vw"}}
                                  onChange={(e) => handleUpdateStartPage(e)}
                                />
                                <Form.Control
                                  type="number"
                                  name="end#"
                                  placeholder="End Page"
                                  style={{marginLeft:"4vw", marginRight: "4vw"}}
                                  onChange={(e) => handleUpdateEndPage(e)}
                                />
                              </Form.Group>
                              <hr />
                              <Form.Group className="mb-3 d-flex flex-row justify-content-around w-100 h-100">
                                <BootstrapSwitchButton
                                    checked={aiEnabled}
                                    onlabel='AI'
                                    offlabel='No AI'
                                    width={100}
                                    onChange={(checked) => {
                                      updateAiEnabled(checked);
                                  }}
                                />
                                <Dropdown>
                                    <Dropdown.Toggle
                                      style={{ backgroundColor: "white" , width: "100%"}}
                                      id="dropdown-basic"
                                      disabled={!aiEnabled}
                                    >
                                      {selectedTemplate.name}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu style={{width: "100%"}}>
                                      {templates?.map(
                                        (item, index) => {
                                          return (
                                            <Dropdown.Item
                                              name={item.name}
                                              key={index}
                                              onClick={() => setSelectedTemplate(item)}
                                            >
                                              {item.name}
                                            </Dropdown.Item>
                                          );
                                        },
                                      )}
                                      <Dropdown.Item
                                              name="templates"
                                              href="/templates/"
                                              style={{backgroundColor: "#66ab57"}}
                                            >
                                              Add/Edit <FontAwesomeIcon size="xl" icon={faPlus} />
                                      </Dropdown.Item>
                                    </Dropdown.Menu>
                                  </Dropdown>
                              </Form.Group>
                            </Col>
                          </Row>
                          <Button variant="primary" type="submit" onClick={handleSubmitNofo}>
                              Submit
                          </Button>
                        </Form>
                    )
                  ) : (
                    <Loading />
                  )}
                </Tab.Pane>
                <Tab.Pane eventKey="#link2">
                  <Row style={{marginTop: "1vh", zoom: "74%"}}>
                    <Col
                      sm={4}
                      className="overflow-auto"
                      style={{ maxHeight: "125vh" }}
                    >
                      <ListGroup>
                        <InputGroup className="mb-1">
                          <InputGroup.Text>
                            Header Search
                          </InputGroup.Text>
                          <Form.Control
                            aria-label="search"
                            value={searchInput}
                            onChange={(e) => handleNofoSearch(e)}
                          />
                        </InputGroup>
                        <Row className="mb-3 g-1">
                        <Col>
                        <Dropdown>
                          <Dropdown.Toggle
                            style={{ backgroundColor: "white" , width: "100%"}}
                            id="dropdown-basic"
                          >
                            {activeSectionData}
                          </Dropdown.Toggle>
                          <Dropdown.Menu style={{width: "100%"}}>
                            {Object.keys(sectionData)?.map(
                              (item, index) => {
                                return (
                                  <Dropdown.Item
                                    name={item}
                                    key={index}
                                    onClick={(e) => handleActiveFilter(e)}
                                  >
                                    {item}: {sectionData[item][0]}-
                                    {sectionData[item][1]}
                                  </Dropdown.Item>
                                );
                              },
                            )}
                            <Dropdown.Item
                              name="flagged"
                              onClick={(e) => handleActiveFilter(e)}
                            >
                              <FontAwesomeIcon color="red" icon={faFlag} />{" "}
                              Flagged Content
                            </Dropdown.Item>
                            {addingSection.adding ? (
                              <Container
                                style={{
                                  paddingTop: "1vh",
                                  borderTop: "3px solid rgb(212, 212, 212)",
                                  display: "flex",
                                  flexDirection: "column",
                                  width: "100%"
                                }}
                              >
                                <textarea
                                  type="text"
                                  name="section"
                                  placeholder="Section Name"
                                  onChange={(e) =>
                                    handleChangeNewSection(e)
                                  }
                                />
                                <input
                                  type="number"
                                  name="start"
                                  placeholder="Page Start (Number Only)"
                                  onChange={(e) =>
                                    handleChangeNewSection(e)
                                  }
                                />
                                <input
                                  type="number"
                                  name="end"
                                  placeholder="Page End (Number Only)"
                                  onChange={(e) =>
                                    handleChangeNewSection(e)
                                  }
                                />
                                <Row>
                                  <Dropdown.Item
                                    onClick={() => handleSubmitNewSection()}
                                  >
                                    <FontAwesomeIcon
                                      size="sm"
                                      icon={faFloppyDisk}
                                    />
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() =>
                                      updateAddingSection({
                                        adding: false,
                                        section: null,
                                        start: null,
                                        end: null,
                                      })
                                    }
                                  >
                                    <FontAwesomeIcon size="sm" icon={faX} />
                                  </Dropdown.Item>
                                </Row>
                              </Container>
                            ) : (
                              <>
                                <Dropdown.Item
                                  onClick={() => {
                                    updateComplianceData(
                                      proposalData.complianceimages_set,
                                    );
                                    updateActiveSectionData(
                                      "Section Filters",
                                    );
                                  }}
                                >
                                  <FontAwesomeIcon
                                    size="sm"
                                    icon={faClockRotateLeft}
                                  />{" "}
                                  Reset
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onMouseEnter={() =>
                                    updateAddingSection({
                                      ...addingSection,
                                      adding: true,
                                    })
                                  }
                                >
                                  <FontAwesomeIcon
                                    size="sm"
                                    icon={faPlus}
                                  />{" "}
                                  Add
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                        </Col>
                        <Col
                          onDragOver={(e) => handleAllowDrop(e)}
                          onDrop={(e) => handleDropDelete(e)}
                        >
                        <Button style={{
                            border: "1px solid #f44336",
                            borderRadius: "5px",
                            width: "100%",
                            backgroundColor: "white"
                          }}>
                          <FontAwesomeIcon size="xl" icon={faTrashCan} />
                        </Button>
                        </Col>
                        </Row>
                        {complianceData?.map((item, index) => {
                          return (
                            <>
                              {item.content_text.length === 0 ||
                              item.content_text === "\f" ? (
                                <ListGroup.Item
                                  className="d-flex justify-content-center bg-dark"
                                  action
                                  name={item.id}
                                  key={index}
                                  href={`#link${index}`}
                                  draggable="false"
                                  onDragStart={(e) => handleDrag(e)}
                                >
                                  <FontAwesomeIcon
                                    onClick={() =>
                                      handleFlagged(item.id)
                                    }
                                    style={{ marginRight: "2px" }}
                                    color={item.flagged}
                                    size="sm"
                                    icon={faFlag}
                                  />
                                  <img
                                    src={item.title}
                                    name={item.id}
                                    alt={index}
                                    style={{
                                      maxWidth: "50vh",
                                      height: "auto",
                                      borderRadius: "5px",
                                    }}
                                  />
                                </ListGroup.Item>
                              ) : (
                                <ListGroup.Item
                                  className="d-flex justify-content-center"
                                  action
                                  name={item.id}
                                  key={index}
                                  href={`#link${index}`}
                                  draggable="true"
                                  onDragStart={(e) => handleDrag(e)}
                                >
                                  <FontAwesomeIcon
                                    onClick={() =>
                                      handleFlagged(item.id)
                                    }
                                    style={{ marginRight: "2px" }}
                                    color={item.flagged}
                                    size="sm"
                                    icon={faFlag}
                                  />
                                  <img
                                    src={item.title}
                                    name={item.id}
                                    alt={index}
                                    style={{
                                      maxWidth: "50vh",
                                      height: "auto",
                                      borderRadius: "5px",
                                    }}
                                  />
                                </ListGroup.Item>
                              )}
                            </>
                          );
                        })}
                      </ListGroup>
                    </Col>
                    <Col
                      sm={8}
                      className="d-flex justify-content-center overflow-scroll"
                      style={{ maxHeight: "125vh" }}
                    > {proposalData.loading_checklist ? <LoadingChecklist pk={pk} refresh={refreshPage} loading_checklist={proposalData.loading_checklist}/> :
                      <Form style={{ width: "100%" }}>
                        <OverlayTrigger
                            placement="bottom"
                            delay={{ show: 1000, hide: 50 }}
                            overlay={
                              <Popover style={{backgroundColor: "#66ab57", zoom:"74%"}} className="custom-pover">
                                <Popover.Body style={{backgroundColor: "white"}} className="custom-pover-body">
                                  <div>Add new row to checklist</div>
                                </Popover.Body>
                              </Popover>
                            }>
                              <Button
                                style={{ marginBottom: "1vh"}}
                                onClick={() => handleAddToChecklist()}
                              >
                                <FontAwesomeIcon
                                  size="sm"
                                  icon={faPlus}
                                />
                              </Button>
                          </OverlayTrigger>
                          <OverlayTrigger
                            placement="bottom"
                            delay={{ show: 1000, hide: 50 }}
                            overlay={
                              <Popover style={{backgroundColor: "#66ab57", zoom:"74%"}} className="custom-pover">
                                <Popover.Body style={{backgroundColor: "white"}} className="custom-pover-body">
                                  <div>Save checklist</div>
                                </Popover.Body>
                              </Popover>
                            }>
                              <Button
                                style={{
                                  marginBottom: "1vh",
                                  marginLeft: "1vh",
                                  marginRight: "1vh",
                                }}
                                onClick={() => handleSaveChecklist()}
                              >
                                <FontAwesomeIcon
                                  size="sm"
                                  icon={faFloppyDisk}
                                />
                              </Button>
                          </OverlayTrigger>
                              <CsvDownloadButton
                                style={{ marginBottom: "1vh" }}
                                className="btn btn-primary"
                                data={checklistData}
                                delimiter=","
                              >
                                <OverlayTrigger
                            placement="bottom"
                            delay={{ show: 1000, hide: 50 }}
                            overlay={
                              <Popover style={{backgroundColor: "#66ab57", zoom:"74%"}} className="custom-pover">
                                <Popover.Body style={{backgroundColor: "white"}} className="custom-pover-body">
                                  <div>Export checklist to Excel</div>
                                </Popover.Body>
                              </Popover>
                            }>
                                <FontAwesomeIcon
                                  size="sm"
                                  icon={faFileCsv}
                                />
                              </OverlayTrigger>
                              </CsvDownloadButton>
                        <Table striped bordered hover>
                          <thead>
                            <tr>
                              <th>Pg.</th>
                              <th>Item</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {checklistData?.map((item, index) => {
                              return (
                                <tr
                                  key={index}
                                  name={item.id
                                    .toString()
                                    .concat("_item")}
                                >
                                  <td style={{ maxWidth: "10vh" }}>
                                    <Form.Control
                                      name={item.id
                                        .toString()
                                        .concat("_pages")}
                                      as="textarea"
                                      value={item.page?.toString()}
                                      onChange={(e) =>
                                        handleChecklistChange(e)
                                      }
                                    />
                                  </td>
                                  <td
                                    style={{
                                      maxWidth: "20vh",
                                      cursor: "grab",
                                    }}
                                    draggable
                                    onDragStart={(e) =>
                                      handleDragSection(e, item.id)
                                    }
                                    onDragOver={(e) =>
                                      handleAllowDrop(e)
                                    }
                                    onDrop={(e) =>
                                      handleDropSection(e)
                                    }
                                  >
                                    <Form.Control
                                      name={item.id
                                        .toString()
                                        .concat("_item")}
                                      as="textarea"
                                      value={item.item}
                                      onChange={(e) =>
                                        handleChecklistChange(e)
                                      }
                                    />
                                  </td>
                                  <td>
                                    <Form.Control
                                      name={item.id
                                        .toString()
                                        .concat("_data")}
                                      as="textarea"
                                      value={item.data}
                                      style={{ minWidth: "50vh" }}
                                      onDragOver={(e) =>
                                        handleAllowDrop(e)
                                      }
                                      onDrop={(e) =>
                                        handleDropSection(e)
                                      }
                                      onChange={(e) =>
                                        handleChecklistChange(e)
                                      }
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </Form>
                      }
                    </Col>
                  </Row>
                </Tab.Pane>
                <Tab.Pane eventKey="#link3">
                  <Outline checklistData={checklistData} proposalData={proposalData} />
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      ) : (
        <Loading />
      )}
    </>
  );
}

export default ComplianceListV2;
