import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardHeader, CardFooter, Spinner } from "reactstrap";
import HeaderCardWithSubtitle from "../../../../components/Headers/HeaderCardWithSubtitle";
import ItemsTable from "./ItemsTable.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";
import { formatDate } from "../../../../config/util.js";
import { ViewSalesContext } from "./../context/ViewSalesContext.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";

import { getInvoiceItems } from "../../../../helper/invoice.js";
import { statusColors, portalModules } from "../../../../config/config.js";
import InvoiceReceiptModel from "../../../components/POS/InvoiceReceiptModel.js";
import { roundPrice } from "views/common-utils/calculations.util.js";
import { createFirca } from "../../../../helper/firca.js";
import PrintCrystalReport from "../../../components/PrintCrystalReport.js";

const ItemSummary = () => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const { selectedRecord, resetItems, setSelectedRecord, items, setInvoiceItems, getTotalQuantity, getTaxableAmount, getTotalTax, getTotalInvoiceAmount } = useContext(ViewSalesContext);

  const [warningMsg, setWarningMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openInvoiceReceiptModal, setInvoiceReceiptModal] = useState(false);
  const [fircaResponse, setFircaResponse] = useState("");
  const [timItemList, setTimItemList] = useState([]);

  const handleCancel = () => {
    resetItems();
    setSelectedRecord("");
    setWarningMsg("");
  }

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const items = await getInvoiceItems(selectedRecord.DocNum);
        setInvoiceItems(items?.itemsList);
      }
      catch(err) {
        setWarningMsg(err?.message);
      }
      finally {
        setIsLoading(false);
      }
    }
    if(selectedRecord.DocNum) {
      fetchItems();
    }
  }, [selectedRecord, selectedRecord?.DocNum])

  const handleReprint = async () => {
    try {
      let request = {
        invoice: {
          DocNum: selectedRecord.DocNum,
          DocEntry: selectedRecord.DocEntry,
          CompanyCode: process.env.REACT_APP_COMPANY_NAME
        }
      }
      const response = await createFirca(request);
      if (response) {
        setFircaResponse(response);
        // TIM Items list for POS Invoice Receipt
        setTimItemList(response?.timItemList?.itemsList ? response.timItemList.itemsList : []);
        setInvoiceReceiptModal(true)
      }
    }
    catch (err) {
      setWarningMsg(err?.message);
    }
  }

  const toggleInvoiceReceiptModal = () => {
    setInvoiceReceiptModal(!openInvoiceReceiptModal);
  }

  const closeInvoiceReceiptModal = () => {
    setInvoiceReceiptModal(false);
    handleCancel();
  }

  const rightContent = (
      <>
      { selectedRecord?.U_IsReprinted === "N" ?
        <Button
          color="primary"
          onClick={handleReprint}
          className="ml-3"
          size="md"
        >
          Reprint copy
        </Button>
        : ""}
        { selectedRecord?.U_IsReprinted === "N" ?
        <PrintCrystalReport
          className="ml-3"
          moduleName={portalModules.INVOICE}
          docEntry={selectedRecord.DocEntry}
          reportName={process.env.REACT_APP_SALES_INVOICE_CRT}
          buttonType={"button"}
          buttonName={"A4 Print"}
          size="md"
        />
      : ""}
      </>
  );

  return (
    <>
      <Card className="shadow">
        {/* <HeaderCard title={"Items"} className="border-0" rightContent={
          selectedRecord?.DocNum &&
          <h4 className="ml-2 font-weight-700">
            Returns# <span className="text-primary">{selectedRecord.DocNum}</span>
          </h4>
        } /> */}
        <div className="pb-1">
          <HeaderCardWithSubtitle
            title={`Invoice# ${selectedRecord.DocNum}`}
            subTitle={"Items present in the invoice."}
            rightContent={rightContent}
          />
        </div>
        <CardBody className="p-0">
          <ItemsTable />
        </CardBody>
        <CardFooter className="border-0">
          {isLoading ?
            <>
              <small className="my-2 text-primary">
                Processing... &emsp;
              </small>
              <Spinner color="primary" className="reload-spinner" />
            </>
            :
            <Row className="text-left">
              <Col>
                <Button
                  color="info"
                  onClick={handleCancel}
                  className="btn-square"
                  size="lg"
                >
                  Back
                </Button>
              </Col>
              <Col>
                {warningMsg &&
                  <DisplayMessage type={statusColors.WARNING} iconSize="text-sm" message={warningMsg} />}
              </Col>
            </Row>
          }
        </CardFooter>
      </Card>
      {selectedRecord ?
        //customer?.U_CustomerType === customerTypes.B2C || isOneTimeCustomer ?
        <InvoiceReceiptModel
          invoiceNo={selectedRecord.DocNum}
          qrCode={fircaResponse?.qrCode ? fircaResponse.qrCode : ""}
          companyName={userSessionLog.locationDefaults.U_LocName}
          companyAddress={userSessionLog.locationDefaults.U_LocAddress}
          companyStore={userSessionLog.locationDefaults.U_Store}
          companyPhone={userSessionLog.locationDefaults.U_Phone}
          companyWebsite={userSessionLog.locationDefaults.U_Website}
          companyEmail={userSessionLog.locationDefaults.U_Email}
          userName={localStorage.getItem("UserName")}
          invoiceCounter={fircaResponse?.InvCount ? fircaResponse.InvCount : ""}
          sdcInvoiceNo={fircaResponse?.SDCInvNum ? fircaResponse.SDCInvNum : ""}
          sdcTime={fircaResponse?.SDCTime ? fircaResponse.SDCTime : ""}
          vehicleNo={fircaResponse?.VehicleNo ? fircaResponse.VehicleNo : ""}
          isOpen={openInvoiceReceiptModal}
          closeModal={closeInvoiceReceiptModal}
          toggleModal={toggleInvoiceReceiptModal}
          invoiceType="======= THIS IS NOT A FISCAL INVOICE ======="
          salesType="---------------- COPY SALE -----------------"
          endOfInvoice="===== END OF NON-FISCAL INVOICE ====="
          pickType="COPY PICKING SLIP"
          callFrom="ViewInvoice"
          posNo={userSessionLog.storeLocation}
          firstDate={formatDate(new Date(), "YYYY-MM-DD HH:mm:ss")}
          secondDate={formatDate(new Date(), "dddd DD/MM/YY hh:mm:ss")}
          user={userSessionLog.userName}
          cashierTIN={userSessionLog.userTIN}
          customerTIN={selectedRecord.LicTradNum ? selectedRecord.LicTradNum : ""}
          customerName={selectedRecord.U_CODCntName ? selectedRecord.U_CODCntName : selectedRecord.CardName}
          customerMobile={selectedRecord.U_CODTlePhone ? selectedRecord.U_CODTlePhone : selectedRecord.Cellular}
          referenceNo=""
          terminal={userSessionLog.counterName}
          comments={selectedRecord.Comments}
          documentLines={items}
          totalQty={getTotalQuantity()}
          subTotal={getTaxableAmount()}
          tax={getTotalTax()}
          totalAmount={roundPrice(getTotalInvoiceAmount())}
          timItemList={timItemList}
          roundOff={0}
          paidAmount={""}
          paymentType={selectedRecord.U_PaymentType}
          change={selectedRecord.Change ? selectedRecord.Change : "0.00"}
          surcharge={""}
          resetInvoiceData={handleCancel}
          closeWithEsc={true}
        />
        : ""
      }
    </>
  );
};

export default ItemSummary;
