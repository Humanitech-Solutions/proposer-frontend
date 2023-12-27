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
import Navbar from "react-bootstrap/Navbar";
import Dropdown from "react-bootstrap/Dropdown";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";

import TextAreaAutoSize from "react-textarea-autosize";

import DeleteProposalModal from "./DeleteProposalModal";

import {
  faPenToSquare,
  faTrashCan,
  faUndo,
  faCalendar,
  faFileWord,
  faPlus,
  faX,
  faFloppyDisk,
  faClockRotateLeft,
  faFlag,
  faArrowRight,
  faArrowLeft,
  faFileCsv,
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
import axios from "axios";

function ComplianceListV2() {
  const { pk } = useParams();
  const [editMode, updateEditMode] = useState(false);
  const [panelRight, updatePanelRight] = useState(false);
  const [proposalData, updateProposalData] = useState(false);
  const [complianceData, updateComplianceData] = useState();
  const [imageMode, updateImageMode] = useState(false);
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

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    maxFiles: 1,
  });
  const [tocPage, updateTocPage] = useState(false);

  useEffect(() => {
    axiosInstance
      .get(`/proposals/${pk}`)
      .catch((error) => {
        console.log(error);
      })
      .then((res) => {
        var resDataCopy = { ...res.data };
        resDataCopy.complianceimages_set.sort((a, b) => a.id - b.id);
        updateProposalData(resDataCopy);
        updateComplianceData(resDataCopy.complianceimages_set);
        updateComplianceDataOriginal(resDataCopy.complianceimages_set);
        updateSectionData(resDataCopy.compliance_sections);
        updateChecklistData(resDataCopy.checklist);
        console.log(res);
        console.log(resDataCopy);
      });
  }, [updateProposalData, pk]);

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

  const configuration = new Configuration({
    organization: process.env.REACT_APP_ORG_KEY,
    apiKey: process.env.REACT_APP_API_AI_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const files = acceptedFiles.map((file) => (
    <li key={file.path}>
      {file.path} - {file.size} - {file.type}bytes
    </li>
  ));

  const handleUpdateTocPage = (e) => {
    updateTocPage(e.target.value);
  };

  const handleSubmitNofo = (e) => {
    e.preventDefault();
    if (acceptedFiles[0] == null) {
      alert("Please input a PDF");
    } else if (tocPage === false) {
      alert("Please input the PDF's Table of Contents Page");
    } else {
      let formData = new FormData();
      formData.append("title", proposalData.title);
      formData.append("nofo", acceptedFiles[0]);
      formData.append("toc", tocPage);
      axiosInstance.defaults.headers["Content-Type"] = "multipart/form-data";
      axiosInstance.defaults.timeout = 2000000; // axiosInstance.timeout = 2000000;
      updateRunningTrigger(true);
      axiosInstance
        .put(`proposals/${pk}/update/`, formData)
        .catch((error) => {
          axiosInstance.defaults.headers["Content-Type"] = "application/json";
          axiosInstance.defaults.timeout = 30000;
          console.log(error.response);
        })
        .then((res) => {
          axiosInstance.defaults.headers["Content-Type"] = "application/json";
          axiosInstance.defaults.timeout = 30000;
          if (res.status === 200) {
            console.log(res.data);
            updateProposalData(res.data);
            updateRunningTrigger(false);
          }
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

  // const handleDropCalendar = (e) => {
  //     console.log(e.dataTransfer.getData('name'))
  // }

  const handleDropOutline = async (e) => {
    var id = e.dataTransfer.getData("name");
    var specificComplianceItem = complianceData.find((item) => {
      return item.id === parseInt(id);
    });
    var previousData = [...aiData];
    var prompt = activeAiPrompt + ": ";
    try {
      const result = await openai.createCompletion({
        model: process.env.REACT_APP_MODEL,
        max_tokens: 1024,
        prompt: prompt.concat(specificComplianceItem.content_text),
      });
      previousData.push(result.data.choices[0].text);
      updateAiData(previousData);
    } catch (e) {
      //console.log(e);
      console.log(e);
    }
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
      cklistcopy[objIndex].pages = cklistcopy[objIndex].pages.concat(
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

  // const handleSubmit = (e) => {
  //     e.preventDefault();
  //     const newProposalData = Object.assign({}, proposalData);
  //     newProposalData.complianceimages_set = [...complianceData];
  //     updateProposalData(newProposalData)

  //     axiosInstance
  //         .put(`proposals/${proposal.pk}/update/`, {
  //             title: proposalData.title,
  //             complianceimages_set: [...complianceData]
  //         })
  //         .catch((error) => {
  //             console.log(error.response)
  //         })
  //         .then((res) => {
  //             console.log(res)
  //         });
  // };

  //new section functionality
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

  const handleImageMode = (e) => {
    updateImageMode(e);
  };

  const handleChangeNewPrompt = (e) => {
    var addingPromptCopy = addingPrompt;
    addingPromptCopy[e.target.name] = e.target.value.trim();
    updateAddingPrompt(addingPromptCopy);
  };

  const handleSavePrompt = (prompt) => {
    var currentPromptsCopy = aiPrompts;
    currentPromptsCopy.push(prompt);
    updateActiveAiPrompt(prompt);
    updateAddingPrompt({ adding: false, prompt: null });
    updateAiPrompts(currentPromptsCopy);
  };

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
    checklistCopy.push({ item: "", id: maxId + 1, data: "", pages: "" });
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

  // const handleCsvExport = () => {

  // }

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
        <Tab.Container id="list-group-tabs" defaultActiveKey="#link1">
          <Container fluid className="h-100 w-100">
            <Row className="h-100">
              <Col
                className="d-flex justify-content-start bg-dark h-100 flex-column align-content-center"
                lg={2}
              >
                <ListGroup>
                  <ListGroup.Item>
                    <Container
                      style={{
                        width: "166px",
                      }}
                    >
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
                    Compliance
                  </ListGroup.Item>
                  {proposalData.nofo ? (
                    <>
                      {/* <ListGroup.Item action href="#link2">
                Calendar
                </ListGroup.Item> */}
                      <ListGroup.Item action href="#link3">
                        Outline
                      </ListGroup.Item>
                    </>
                  ) : (
                    <></>
                  )}
                </ListGroup>
                <hr />
                <ListGroup>
                  <ListGroup.Item>
                    <Button
                      style={{ backgroundColor: "#f44336", color: "white" }}
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
              <Col
                lg={10}
                style={{ overflow: "hidden", height: "100%", display: "flex" }}
              >
                <Tab.Content>
                  <Tab.Pane
                    eventKey="#link1"
                    className="h-100 d-flex flex-column"
                  >
                    {proposalData ? (
                      proposalData.nofo ? (
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
                                      onChange={(e) =>
                                        handleChangeCompliance(e)
                                      }
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
                                      onChange={(e) =>
                                        handleChangeCompliance(e)
                                      }
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
                        ) : (
                          //viewing
                          <>
                            <Navbar
                              style={{
                                borderBottom: "3px solid rgb(212, 212, 212)",
                              }}
                              variant="light"
                              bg="white"
                              className="d-flex justify-content-center mb-2"
                            >
                              {panelRight ? (
                                <Col
                                  onClick={() => updatePanelRight(false)}
                                  style={{ maxWidth: "5vw", cursor: "pointer" }}
                                >
                                  <FontAwesomeIcon
                                    size="2xl"
                                    icon={faArrowLeft}
                                  />
                                </Col>
                              ) : (
                                <></>
                              )}
                              <Dropdown>
                                <Dropdown.Toggle
                                  style={{ backgroundColor: "white" }}
                                  id="dropdown-basic"
                                >
                                  {activeSectionData}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  {Object.keys(sectionData)?.map(
                                    (item, index) => {
                                      return (
                                        <Dropdown.Item
                                          name={item}
                                          key={item.id}
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
                                    <FontAwesomeIcon
                                      color="red"
                                      icon={faFlag}
                                    />{" "}
                                    Flagged Content
                                  </Dropdown.Item>
                                  {addingSection.adding ? (
                                    <Container
                                      style={{
                                        paddingTop: "1vh",
                                        borderTop:
                                          "3px solid rgb(212, 212, 212)",
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
                                          onClick={() =>
                                            handleSubmitNewSection()
                                          }
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
                                          <FontAwesomeIcon
                                            size="sm"
                                            icon={faX}
                                          />
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
                              {/* <Col style={{ padding: "3px", backgroundColor: "#AEBC37", borderRadius: "5px", marginLeft:'1vw', marginRight:'1vw'}} onDragOver={(e) => handleAllowDrop(e)} onDrop={(e) => handleDropCalendar(e)}>
        <FontAwesomeIcon size="2xl" icon={faCalendar} />
    </Col> */}
                              <Col
                                style={{
                                  padding: "3px",
                                  backgroundColor: "#9ab6da",
                                  borderRadius: "5px",
                                  marginLeft: "1vw",
                                  marginRight: "1vw",
                                  maxWidth: "30vw",
                                }}
                                onDragOver={(e) => handleAllowDrop(e)}
                                onDrop={(e) => handleDropOutline(e)}
                              >
                                <Dropdown>
                                  {activeAiPrompt.length === 0 ? (
                                    <FontAwesomeIcon
                                      size="2xl"
                                      icon={faFileWord}
                                    />
                                  ) : (
                                    <></>
                                  )}
                                  <Dropdown.Toggle
                                    style={{
                                      backgroundColor: "#9ab6da",
                                      marginLeft: "10px",
                                      maxWidth: "20vw",
                                      display: "inline-block",
                                      overflow: "hidden",
                                      whiteSpace: "nowrap",
                                      textOverflow: "ellipsis",
                                    }}
                                    id="dropdown-basic"
                                  >
                                    {activeAiPrompt}
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu style={{ maxWidth: "25vw" }}>
                                    {Object.keys(aiPrompts)?.map(
                                      (item, index) => {
                                        return (
                                          <Container>
                                            <Button
                                              style={{
                                                backgroundColor: "white",
                                              }}
                                              name={item}
                                              key={item.id}
                                              onClick={() =>
                                                updateActiveAiPrompt(
                                                  aiPrompts[item],
                                                )
                                              }
                                            >
                                              {index + 1}: {aiPrompts[item]}
                                            </Button>
                                          </Container>
                                        );
                                      },
                                    )}
                                    {addingPrompt.adding ? (
                                      <Container
                                        style={{
                                          paddingTop: "1vh",
                                          borderTop:
                                            "3px solid rgb(212, 212, 212)",
                                        }}
                                      >
                                        <textarea
                                          type="text"
                                          name="prompt"
                                          placeholder="Prompt Name"
                                          onChange={(e) =>
                                            handleChangeNewPrompt(e)
                                          }
                                        />
                                        <Row>
                                          <Dropdown.Item
                                            onClick={() =>
                                              handleSavePrompt(
                                                addingPrompt.prompt,
                                              )
                                            }
                                          >
                                            <FontAwesomeIcon
                                              size="sm"
                                              icon={faFloppyDisk}
                                            />
                                          </Dropdown.Item>
                                          <Dropdown.Item
                                            onClick={() =>
                                              updateAddingPrompt({
                                                ...addingPrompt,
                                                adding: false,
                                              })
                                            }
                                          >
                                            <FontAwesomeIcon
                                              size="sm"
                                              icon={faX}
                                            />
                                          </Dropdown.Item>
                                        </Row>
                                      </Container>
                                    ) : (
                                      <>
                                        <Dropdown.Item
                                          onMouseEnter={() =>
                                            updateAddingPrompt({
                                              ...addingPrompt,
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
                                style={{
                                  padding: "3px",
                                  backgroundColor: "#f44336",
                                  borderRadius: "5px",
                                  marginLeft: "1vw",
                                  marginRight: "1vw",
                                  maxWidth: "30vw",
                                }}
                                onDragOver={(e) => handleAllowDrop(e)}
                                onDrop={(e) => handleDropDelete(e)}
                              >
                                <FontAwesomeIcon size="2xl" icon={faTrashCan} />
                              </Col>
                              {panelRight ? (
                                <></>
                              ) : (
                                <Col
                                  onClick={() => updatePanelRight(true)}
                                  style={{ maxWidth: "5vw", cursor: "pointer" }}
                                >
                                  <FontAwesomeIcon
                                    size="2xl"
                                    icon={faArrowRight}
                                  />
                                </Col>
                              )}
                            </Navbar>
                            <Tab.Container
                              id="list-group-tabs"
                              defaultActiveKey="#link1"
                            >
                              <Row className="flex-grow-1 overflow-hidden">
                                {panelRight ? (
                                  <Col
                                    sm={8}
                                    className="d-flex justify-content-center overflow-scroll"
                                    style={{ maxHeight: "90vh" }}
                                  >
                                    <Form style={{ width: "100%" }}>
                                      <Button
                                        style={{ marginBottom: "1vh" }}
                                        onClick={() => handleAddToChecklist()}
                                      >
                                        <FontAwesomeIcon
                                          size="sm"
                                          icon={faPlus}
                                        />
                                      </Button>
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
                                      <CsvDownloadButton
                                        style={{ marginBottom: "1vh" }}
                                        className="btn btn-primary"
                                        data={checklistData}
                                        delimiter=","
                                      >
                                        <FontAwesomeIcon
                                          size="sm"
                                          icon={faFileCsv}
                                        />
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
                                                key={item.id}
                                                name={item.id
                                                  .toString()
                                                  .concat("_item")}
                                              >
                                                <td
                                                  style={{ maxWidth: "10vh" }}
                                                >
                                                  <Form.Control
                                                    name={item.id
                                                      .toString()
                                                      .concat("_pages")}
                                                    as="textarea"
                                                    value={item.pages}
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
                                                    handleDragSection(
                                                      e,
                                                      item.id,
                                                    )
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
                                  </Col>
                                ) : (
                                  <></>
                                )}
                                <Col
                                  sm={5}
                                  className="overflow-scroll h-100"
                                  style={{ maxHeight: "90vh" }}
                                >
                                  <ListGroup>
                                    <InputGroup className="mb-3">
                                      <InputGroup.Text>
                                        NOFO Search
                                      </InputGroup.Text>
                                      <Form.Control
                                        aria-label="search"
                                        value={searchInput}
                                        onChange={(e) => handleNofoSearch(e)}
                                      />
                                    </InputGroup>
                                    {complianceData?.map((item, index) => {
                                      return (
                                        <OverlayTrigger
                                          placement={
                                            panelRight ? "left" : "right"
                                          }
                                          key={item.id}
                                          delay={{ show: 250, hide: 400 }}
                                          overlay={
                                            <Popover className="custom-pover">
                                              <Popover.Header
                                                as="h3"
                                                className="custom-pover-header"
                                              >{`Page #${item.page_number} (Double Click to Edit)`}</Popover.Header>
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
                                              key={item.id}
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
                                                  maxWidth: "100%",
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
                                              key={item.id}
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
                                                  maxWidth: "100%",
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
                                {panelRight ? (
                                  <></>
                                ) : (
                                  <Col sm={7} className="overflow-auto h-100">
                                    <div
                                      className="sticky-top w-100"
                                      style={{ backgroundColor: "white" }}
                                    >
                                      <Button
                                        onClick={() =>
                                          handleImageMode(!imageMode)
                                        }
                                      >
                                        View
                                        {imageMode
                                          ? " Scanned Text"
                                          : " Source Image"}
                                      </Button>
                                    </div>
                                    <Tab.Content className="d-flex flex-column">
                                      {complianceData?.map((item, index) => {
                                        return (
                                          <>
                                            {imageMode ? (
                                              <Tab.Pane
                                                key={item.id}
                                                eventKey={`#link${index}`}
                                              >
                                                <img
                                                  src={item.content}
                                                  alt={index}
                                                  width="100%"
                                                  height="auto"
                                                />
                                              </Tab.Pane>
                                            ) : (
                                              <Tab.Pane
                                                key={item.id}
                                                eventKey={`#link${index}`}
                                              >
                                                <div className="text-start fs-8 my-3 mx-5">
                                                  {item.content_text}
                                                </div>
                                              </Tab.Pane>
                                            )}
                                          </>
                                        );
                                      })}
                                    </Tab.Content>
                                  </Col>
                                )}
                              </Row>
                            </Tab.Container>
                          </>
                        )
                      ) : //Loading
                      runningTrigger ? (
                        <Container>
                          Leave this page open while the server processess the
                          docuemnt. This should take ~15 minutes for a 50 page
                          document and ~30 minutes for a 100 page document.
                          <Loading />
                        </Container>
                      ) : (
                        //Initial NOFO Input
                        <Col
                          className="d-flex justify-content-center align-items-center"
                          style={{ height: "80vh", flexDirection: "column" }}
                        >
                          <div
                            style={{
                              marginTop: "10px",
                              marginBottom: "10px",
                              width: "50%",
                            }}
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
                                  : "Add your PDF NOFO Here"}
                              </p>
                            </div>
                          </div>
                          <Form.Control
                            type="number"
                            name="toc#"
                            placeholder="Enter the Table of Contents Page #"
                            style={{ marginBottom: "10px", width: "35%" }}
                            onChange={(e) => handleUpdateTocPage(e)}
                          />
                          <Button
                            variant="primary"
                            type="submit"
                            onClick={handleSubmitNofo}
                          >
                            Submit
                          </Button>
                        </Col>
                      )
                    ) : (
                      <Loading />
                    )}
                  </Tab.Pane>
                  <Tab.Pane eventKey="#link2">Blank</Tab.Pane>
                  <Tab.Pane eventKey="#link3">
                    <Outline textArray={aiData} proposalData={proposalData} />
                  </Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Container>
        </Tab.Container>
      ) : (
        <Loading />
      )}
    </>
  );
}

export default ComplianceListV2;
