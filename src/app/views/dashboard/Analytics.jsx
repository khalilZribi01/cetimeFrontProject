import { Fragment } from "react";
import Card from "@mui/material/Card";
import { styled, useTheme } from "@mui/material/styles";

import RowCards from "./shared/RowCards";
import StatCards from "./shared/StatCards";
import Campaigns from "./shared/Campaigns";
import StatCards2 from "./shared/StatCards2";
import TopSellingTable from "./shared/TopSellingTable";
import DocumentTable from "./shared/DocumentTable";
import DocumentTableClient from "./shared/DocumentTableClient";
import useAuth from "app/hooks/useAuth";

import KpiPrestationsCard from "./shared/KpiPrestationsCard"; // 👈 NEW

const ContentBox = styled("div")(({ theme }) => ({
  margin: "2rem",
  [theme.breakpoints.down("sm")]: { margin: "1rem" }
}));

const FlexRow = styled("div")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(3),
  marginBottom: theme.spacing(3)
}));

const HalfBox = styled("div")(() => ({
  flex: "1 1 calc(50% - 24px)", // 2 par ligne avec gap=24px
  minWidth: 300 // pour éviter que ça devienne trop petit
}));

const H4 = styled("h4")(({ theme }) => ({
  fontSize: "1rem",
  fontWeight: 500,
  marginBottom: "1rem",
  textTransform: "capitalize",
  color: theme.palette.text.secondary
}));

export default function Analytics() {
  const { palette } = useTheme();
  const { role } = useAuth();

  return (
    <Fragment>
      <ContentBox className="analytics">
        {/* Ligne 1 */}
        <FlexRow>
          <HalfBox>
            <KpiPrestationsCard /> {/* 👈 KPI Prestations */}
          </HalfBox>
        </FlexRow>

        {/* Ligne 2 */}
        <FlexRow>
          {role === "ADMIN" && (
            <>
              <HalfBox>
                <TopSellingTable />
              </HalfBox>

         
              <HalfBox>
                <StatCards />
              </HalfBox>
            </>
          )}

          {role === "CLIENT" && (
            <HalfBox>
              <DocumentTableClient />
            </HalfBox>
          )}

       
        </FlexRow>
      </ContentBox>
    </Fragment>
  );
}
