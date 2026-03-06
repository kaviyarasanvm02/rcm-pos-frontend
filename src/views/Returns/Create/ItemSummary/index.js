import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardHeader, CardFooter, Spinner } from "reactstrap";
import HeaderCard from "../../../../components/Headers/HeaderCardSmall";
import HeaderCardWithSubtitle from "../../../../components/Headers/HeaderCardWithSubtitle";
import ItemsTable from "./ItemsTable.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";

import { ReturnsContext } from "./../context/ReturnsContext.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";

import { getInvoiceItems } from "../../../../helper/invoice.js";
import { createCreditMemo } from "../../../../helper/credit-memo.js";
import { statusColors, timYardItemGroups } from "../../../../config/config.js";

const ItemSummary = ({ onSubmitSuccess }) => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const { selectedInvoice, returnsItems, resetItems, getTotalAmount, creditMemoResponse, setCreditMemoResponse,
    setSelectedInvoice, setReturnsItems, setPaidAmount, setTaxProp, attachmentFile, setAttachmentFile } = useContext(ReturnsContext);
  
  const [isItemsSelected, setIsItemsSelected] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = () => {
    resetItems();
    setSelectedInvoice("");
    setCreditMemoResponse("");
    setWarningMsg("");
  }

  /**
   * Prepares payload to post a Credit Memo Request & 
   * a payload to update the Returned Qty & Remaining Qtys in the Invoice `Row` level recs.
   * @returns 
   */
  const getDocumentLinesAndInvoiceUpdateRequest = () => {
    const docLines = [], invoiceUpdateRequest = [];
    
    // Include the items that are selected for Returns
    returnsItems.forEach((item, key) => {
      if(item.isSelectedForReturn) {
        docLines.push({
          LineNum: key,
          // BaseLine: item.LineNum,
          // BaseType: 13,
          // BaseEntry: selectedInvoice.DocEntry,

          ItemCode: item.ItemCode,
          WarehouseCode: item.WhsCode,
          Quantity: item.Quantity,
          Price: item.Price,  // Price After Discount
          DiscountPercent: item.DiscountPercent,
          VatGroup: item.VatGroup,
          TaxPercentagePerRow: item.TaxPercent,
          TaxTotal: item.TaxLocal,
          LineTotal: item.TotalPrice, //item.LineTotal
          COGSCostingCode: item.COGSBranch,

          U_ReturnedInvoiceNos: item.DocNum,
          
          U_ReturnedQty: item.Quantity,
          U_RemainingOpenQty: item.InvoiceQuantity - item.Quantity,
          U_ReturnReason: item.U_ReturnReason,
          
          DocumentLinesBinAllocations: []
        });

        // Payload to update the Returned Qty & Remaining Qtys in the Invoice Row level recs.
        invoiceUpdateRequest.push({
          DocEntry: item.DocEntry,
          LineNum: item.LineNum,
          // Add the currently Returned Qty to the existing value, if it exists or set the current Qty directly
          U_ReturnedQty: item.U_ReturnedQty ? (item.U_ReturnedQty + item.Quantity) : item.Quantity,
          U_RemainingOpenQty: item.InvoiceQuantity - item.Quantity,
          // U_ReturnReason: item.U_ReturnReason
        });
      }
    });
    return { docLines, invoiceUpdateRequest };
  }

  const validateForm = () => {
    for(let i=0; i < returnsItems.length; i++) {
      if(returnsItems[i].isSelectedForReturn) {
        if(!returnsItems[i].Quantity || returnsItems[i].Quantity < 0 &&
          !timYardItemGroups.includes(returnsItems[i].ItmsGrpName)) {
          setWarningMsg(`Please enter a valid Quantity for Item Code ${returnsItems[i].ItemCode} at Line #${i+1}.`);
          return false;
        }
        else if(!returnsItems[i].U_ReturnReason) {
          setWarningMsg(`Please enter a valid Return Reason for Item Code ${returnsItems[i].ItemCode} at Line #${i+1}.`);
          return false;
        }
      }
    }
    return true;
  }

  const handleSubmit = async () => {
    if(validateForm()) {
      setWarningMsg("");

      // console.log("returnsItems: ", returnsItems);
      setIsLoading(true);

      const { docLines, invoiceUpdateRequest } = getDocumentLinesAndInvoiceUpdateRequest();

      const creditMemoRequest = {
        CardCode: selectedInvoice.CardCode,
        Comments: `${userSessionLog?.storeLocation} - Created via POS.`,
        SalesPersonCode: selectedInvoice.SalesPersonCode,
        // DocDate: new Date(),
        // ShipToCode: "TestAddress ID",
        // SalesPersonCode: 1,
        // DocTotal: getTotalAmount(),
        // DocTotalSys: getTotalAmount(),
        // PaymentGroupCode: 1, //Commented to fix Invalid value  [OINV.GroupNum]
        // BPLId
        BPL_IDAssignedToInvoice: userSessionLog?.locationDefaults?.Branch,
        U_Location: userSessionLog?.storeLocation,
        U_CreatedBy: userSessionLog?.userName + " - "  + userSessionLog?.counterName,
        DocumentLines: docLines
      }

      const request = {
        creditMemoRequest,
        invoiceUpdateRequest
      };
      
      const formData = new FormData();

      // Append file if exists
      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
      }

      console.log("Is File?", attachmentFile instanceof File); // should be true
      formData.append("salesReturnData", JSON.stringify(Object.values(request)));

      for (let pair of formData.entries()) {
        if (pair[1] instanceof Blob) {
          // If it's a Blob, try to read the content
          const reader = new FileReader();
          reader.onload = () => {
            console.log(`Key: ${pair[0]}, Blob Content:`, reader.result);
          };
          reader.readAsText(pair[1]); // Or readAsArrayBuffer if binary
        } else {
          console.log(`Key: ${pair[0]}, Value:`, pair[1]);
        }
      }

      console.log("Create CreditMemo request: ", JSON.stringify(formData));
      // return;

      try{
        //Create Invoice
        const response = await createCreditMemo(formData);
        console.log("Create CreditMemo Response: ", JSON.stringify(response));
        if(response && response.DocNum) {
          setCreditMemoResponse(response);

          // Reset data in the `context`

          // TODO: Create a Context for Returns as well & similar methods
          // TODO: Set BaseDocNum, BaseDocType in Header level.. BaseLine in row level
          
          // setSelectedInvoice({});
          resetItems();
          setPaidAmount(0);
          setTaxProp("");
          setAttachmentFile(null);
          if (onSubmitSuccess) {
            onSubmitSuccess();
          }
        }
      }
      catch(err) {
        if(err.response?.data?.message) {
          setWarningMsg(err.response.data.message);
        }
        else {
          setWarningMsg(err);
        }
      }
      finally {
        setIsLoading(false);
      }
    }
  }

  const isItemsSelectedForReturn = () => {
    // at least one item must be selected for Returns
    const matchingIndex = returnsItems.findIndex(item => item.isSelectedForReturn);
    return matchingIndex > -1;
  }

  // Enable/Disable Submit button
  useEffect(() => {
    if(returnsItems) {
      const isItemsSelected = isItemsSelectedForReturn();
      setIsItemsSelected(isItemsSelected);
    }
  }, [returnsItems]);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const items = await getInvoiceItems(selectedInvoice.DocNum);
        // console.log(`getInvoiceItems: ${JSON.stringify(items.itemsList)}`);
        setReturnsItems(items?.itemsList);
      }
      catch(err) {
        setWarningMsg(err?.message);
      }
      finally {
        setIsLoading(false);
      }
    }
    if(selectedInvoice.DocNum) {
      fetchItems();
    }
  }, [selectedInvoice, selectedInvoice?.DocNum])

  return (
    <>
      <Card className="shadow">
        {/* <HeaderCard title={"Items"} className="border-0" rightContent={
          selectedInvoice?.DocNum &&
          <h4 className="ml-2 font-weight-700">
            Invoice# <span className="text-primary">{selectedInvoice.DocNum}</span>
          </h4>
        } /> */}
        {creditMemoResponse?.DocNum ?
          <CardBody className="p-0">
            <Row className="text-center">
              <Col>
                <DisplayMessage
                  className={"mt-3 display-4"}
                  type={statusColors.SUCCESS}
                  message={`Return Request #${creditMemoResponse.DocNum} created successfully!`}
                />
              </Col>
            </Row>
          </CardBody>
          :
          <>
            <div className="pb-1">
              <HeaderCardWithSubtitle
                title={`Invoice# ${selectedInvoice.DocNum}`}
                subTitle={"Scan an item to add it to the Return request."}
              />
            </div>
            <CardBody className="p-0">
              <ItemsTable setWarningMsg={setWarningMsg} />
            </CardBody>
          </>
        }
        <CardFooter className="border-0">
          {isLoading ?
            <>
              <small className="my-2 text-primary">
                Processing... &emsp;
              </small>
              <Spinner color="primary" className="reload-spinner" />
            </>
          : 
            <Row>
              <Col className="text-left">
                <Button
                  color="info"
                  onClick={handleCancel}
                  className="btn-square"
                  size="lg"
                >
                  Back
                </Button>
              </Col>
              <Col md="6">
                {warningMsg &&
                  <DisplayMessage type={statusColors.WARNING} iconSize="text-sm" message={warningMsg} />}
              </Col>
              {isItemsSelected &&
                <Col className="mr-2 text-right">
                  <Button
                    color="success"
                    onClick={handleSubmit}
                    className="btn-square"
                    size="lg"
                  >
                    Submit
                  </Button>
                </Col>
                }
            </Row>
          }
        </CardFooter>
      </Card>
    </>
  );
};

export default ItemSummary;
